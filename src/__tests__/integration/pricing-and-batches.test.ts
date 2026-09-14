/**
 * Integration tests IT-01, IT-02, IT-03, IT-04, IT-05 (§8.2). Run against a
 * real SQLite database file (migrated fresh for this suite, deleted
 * afterwards) rather than mocks, so they exercise the actual Prisma layer,
 * the RecipeLine XOR triggers, and src/lib/costing-db.ts together.
 *
 * Each test builds its own independently-named fixtures (units are shared
 * since they are cheap and never mutated) so tests never depend on
 * execution order or on each other's data.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./db-harness";
import type { PrismaClient } from "@prisma/client";

let testDb: TestDatabase;
let prisma: PrismaClient;
let costRecipeById: typeof import("@/lib/costing-db").costRecipeById;
let recordIngredientPrice: typeof import("@/lib/costing-db").recordIngredientPrice;
let freezeBatchCosting: typeof import("@/lib/costing-db").freezeBatchCosting;
let purchaseListForBatch: typeof import("@/lib/costing-db").purchaseListForBatch;
let computeAllActiveProductMargins: typeof import("@/lib/costing-db").computeAllActiveProductMargins;

let kgId: string;
let gId: string;
let unitId: string;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  const dbModule = await import("@/lib/db");
  const costingDbModule = await import("@/lib/costing-db");
  prisma = dbModule.prisma;
  ({
    costRecipeById,
    recordIngredientPrice,
    freezeBatchCosting,
    purchaseListForBatch,
    computeAllActiveProductMargins,
  } = costingDbModule);

  const kg = await prisma.unit.create({ data: { name: "kilogram", symbol: "kg", measureType: "MASS" } });
  const g = await prisma.unit.create({ data: { name: "gram", symbol: "g", measureType: "MASS" } });
  const unit = await prisma.unit.create({ data: { name: "unit", symbol: "unit", measureType: "COUNT" } });
  await prisma.unitConversion.create({ data: { fromUnitId: kg.id, toUnitId: g.id, factor: 1000 } });
  kgId = kg.id;
  gId = g.id;
  unitId = unit.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  testDb.cleanup();
});

describe("IT-01: a new price row changes the recipe cost on next calculation", () => {
  it("recomputes a higher total after recordIngredientPrice", async () => {
    const flour = await prisma.ingredient.create({
      data: {
        name: "IT01 Flour",
        purchaseUnitId: kgId,
        purchaseQuantity: 2,
        recipeUnitId: gId,
      },
    });
    await recordIngredientPrice(flour.id, 2000); // R20 per 2kg => R10/kg

    const recipe = await prisma.recipe.create({
      data: { name: "IT01 Loaf", standardYieldQty: 1, yieldUnitId: unitId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: recipe.id, ingredientId: flour.id, quantity: 1000, unitId: gId },
    });

    const before = await costRecipeById(recipe.id);
    expect(before.totalCents).toBe(1000); // 1kg at R10/kg

    await recordIngredientPrice(flour.id, 3000); // price rises to R30 per 2kg => R15/kg

    const after = await costRecipeById(recipe.id);
    expect(after.totalCents).toBe(1500);
    expect(after.totalCents).not.toBe(before.totalCents);
  });
});

describe("IT-02: a price rise below threshold creates a MarginAlert", () => {
  it("writes a MarginAlert when margin crosses below minMarginPercent", async () => {
    const butter = await prisma.ingredient.create({
      data: { name: "IT02 Butter", purchaseUnitId: kgId, purchaseQuantity: 1, recipeUnitId: gId },
    });
    await recordIngredientPrice(butter.id, 5000); // R50/kg => R5/100g

    const recipe = await prisma.recipe.create({
      data: { name: "IT02 Pastry", standardYieldQty: 1, yieldUnitId: unitId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: recipe.id, ingredientId: butter.id, quantity: 100, unitId: gId },
    });
    // unit cost = 500c; selling price 1000c => margin 50% initially, comfortably above threshold
    const product = await prisma.product.create({
      data: { recipeId: recipe.id, sellingPriceCents: 1000, minMarginPercent: 40, active: true },
    });

    const alertsBefore = await prisma.marginAlert.count({ where: { productId: product.id } });
    expect(alertsBefore).toBe(0);

    // Price roughly doubles: butter now costs 1200c/100g => margin drops well below 40%.
    await recordIngredientPrice(butter.id, 12000);

    const alerts = await prisma.marginAlert.findMany({ where: { productId: product.id } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.oldMargin).toBeGreaterThanOrEqual(40);
    expect(alerts[0]!.newMargin).toBeLessThan(40);
  });
});

describe("IT-03: a price change does not alter a COSTED batch's stored cost", () => {
  it("keeps a frozen batch's costedUnitCents unchanged after the ingredient price rises", async () => {
    // --- Set up a recipe costing R10 per unit of ingredient, and a batch ---
    const sugar = await prisma.ingredient.create({
      data: { name: "IT03 Sugar", purchaseUnitId: kgId, purchaseQuantity: 1, recipeUnitId: gId },
    });
    await recordIngredientPrice(sugar.id, 1000); // R10/kg => 1 cent/g

    const recipe = await prisma.recipe.create({
      data: { name: "IT03 Cake", standardYieldQty: 10, yieldUnitId: unitId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: recipe.id, ingredientId: sugar.id, quantity: 1000, unitId: gId }, // 1kg sugar per standard batch
    });

    const batch = await prisma.batch.create({
      data: { recipeId: recipe.id, targetYield: 10, plannedFor: new Date(), status: "PLANNED" },
    });

    // --- Freeze it (simulating the PLANNED -> ... -> COSTED lifecycle) ---
    await freezeBatchCosting(batch.id);
    const frozenBefore = await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(frozenBefore.status).toBe("COSTED");
    expect(frozenBefore.costedTotalCents).toBe(1000); // 1kg sugar @ R10/kg
    expect(frozenBefore.costedUnitCents).toBe(100); // 1000c / 10 units

    // --- Now the ingredient price changes dramatically ---
    await recordIngredientPrice(sugar.id, 5000); // R10/kg -> R50/kg, a 5x rise

    // A *live* recipe cost reflects the new price immediately (this is the
    // contrast that makes the invariant meaningful, not just a stale cache).
    const liveCostAfterPriceChange = await costRecipeById(recipe.id);
    expect(liveCostAfterPriceChange.totalCents).toBe(5000);
    expect(liveCostAfterPriceChange.totalCents).not.toBe(frozenBefore.costedTotalCents);

    // --- But the already-COSTED batch's stored figures must NOT move ---
    const frozenAfter = await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(frozenAfter.costedTotalCents).toBe(frozenBefore.costedTotalCents);
    expect(frozenAfter.costedUnitCents).toBe(frozenBefore.costedUnitCents);
    expect(frozenAfter.costedTotalCents).toBe(1000);
    expect(frozenAfter.costedUnitCents).toBe(100);

    const batchLines = await prisma.batchLine.findMany({ where: { batchId: batch.id } });
    expect(batchLines).toHaveLength(1);
    expect(batchLines[0]!.unitCostCents).toBe(1); // R10/kg AP -> 1c/g EP, frozen
    expect(batchLines[0]!.lineCostCents).toBe(1000); // 1000g * 1c/g

  });
});

describe("IT-04: editing a sub-recipe changes every parent recipe's cost", () => {
  it("propagates a sub-recipe line change to both parents that consume it", async () => {
    const cocoa = await prisma.ingredient.create({
      data: { name: "IT04 Cocoa", purchaseUnitId: kgId, purchaseQuantity: 1, recipeUnitId: gId },
    });
    await recordIngredientPrice(cocoa.id, 10000); // R100/kg => R10/100g

    const sub = await prisma.recipe.create({
      data: { name: "IT04 Ganache", standardYieldQty: 1, yieldUnitId: kgId, isSubRecipe: true },
    });
    const subLine = await prisma.recipeLine.create({
      data: { recipeId: sub.id, ingredientId: cocoa.id, quantity: 100, unitId: gId }, // 1000c
    });

    const parentA = await prisma.recipe.create({
      data: { name: "IT04 Cake A", standardYieldQty: 1, yieldUnitId: unitId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: parentA.id, childRecipeId: sub.id, quantity: 1, unitId: kgId },
    });
    const parentB = await prisma.recipe.create({
      data: { name: "IT04 Cake B", standardYieldQty: 1, yieldUnitId: unitId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: parentB.id, childRecipeId: sub.id, quantity: 1, unitId: kgId },
    });

    const beforeA = await costRecipeById(parentA.id);
    const beforeB = await costRecipeById(parentB.id);
    expect(beforeA.totalCents).toBe(1000);
    expect(beforeB.totalCents).toBe(1000);

    // Double the sub-recipe's cocoa quantity.
    await prisma.recipeLine.update({ where: { id: subLine.id }, data: { quantity: 200 } });

    const afterA = await costRecipeById(parentA.id);
    const afterB = await costRecipeById(parentB.id);
    expect(afterA.totalCents).toBe(2000);
    expect(afterB.totalCents).toBe(2000);
    expect(afterA.totalCents).not.toBe(beforeA.totalCents);
    expect(afterB.totalCents).not.toBe(beforeB.totalCents);
  });
});

describe("IT-05: a batch purchase list matches a hand-calculated expected result", () => {
  it("computes packs-to-buy that matches manual arithmetic", async () => {
    // Flour: bought in 5kg bags, used at 100% yield.
    const flour = await prisma.ingredient.create({
      data: { name: "IT05 Flour", purchaseUnitId: kgId, purchaseQuantity: 5, recipeUnitId: gId },
    });
    await recordIngredientPrice(flour.id, 5000);

    // Carrots: bought in 10kg bags, 80% yield (trim loss).
    const carrots = await prisma.ingredient.create({
      data: {
        name: "IT05 Carrots",
        purchaseUnitId: kgId,
        purchaseQuantity: 10,
        recipeUnitId: gId,
        yieldPercent: 80,
      },
    });
    await recordIngredientPrice(carrots.id, 9500);

    const recipe = await prisma.recipe.create({
      data: { name: "IT05 Muffins", standardYieldQty: 12, yieldUnitId: unitId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: recipe.id, ingredientId: flour.id, quantity: 300, unitId: gId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: recipe.id, ingredientId: carrots.id, quantity: 200, unitId: gId },
    });

    // Scale to 36 units => factor 3.
    // Flour: 300g * 3 = 900g = 0.9kg AP (100% yield) => 0.9 / 5 = 0.18 bags => ceil = 1
    // Carrots: 200g * 3 = 600g EP => AP = 600 / 0.8 = 750g = 0.75kg => 0.75 / 10 = 0.075 bags => ceil = 1
    const list = await purchaseListForBatch(recipe.id, 36);

    const flourLine = list.find((l) => l.ingredientId === flour.id)!;
    const carrotsLine = list.find((l) => l.ingredientId === carrots.id)!;

    expect(flourLine.requiredApQuantity).toBeCloseTo(0.9, 9);
    expect(flourLine.packsToBuy).toBe(1);

    expect(carrotsLine.requiredApQuantity).toBeCloseTo(0.75, 9);
    expect(carrotsLine.packsToBuy).toBe(1);

    // Now scale to a yield large enough to need 2 bags of flour by hand:
    // need > 5kg AP flour => > 5000/300*12... simplify: desiredYield such that
    // flour EP = 300g * factor >= 5000g (5kg). factor = desiredYield/12.
    // 300 * factor >= 5000 => factor >= 16.67 => desiredYield >= 200.
    const bigList = await purchaseListForBatch(recipe.id, 216); // factor 18 => 5400g = 5.4kg => 1.08 bags
    const bigFlourLine = bigList.find((l) => l.ingredientId === flour.id)!;
    expect(bigFlourLine.requiredApQuantity).toBeCloseTo(5.4, 9);
    expect(bigFlourLine.packsToBuy).toBe(2);
  });
});

describe("computeAllActiveProductMargins", () => {
  it("INV-1: omits a product whose recipe cannot currently be costed, rather than reporting 0%", async () => {
    // No price is ever recorded for this ingredient.
    const unpriced = await prisma.ingredient.create({
      data: { name: "CAAPM Unpriced", purchaseUnitId: kgId, purchaseQuantity: 1, recipeUnitId: gId },
    });
    const recipe = await prisma.recipe.create({
      data: { name: "CAAPM Recipe", standardYieldQty: 1, yieldUnitId: unitId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: recipe.id, ingredientId: unpriced.id, quantity: 100, unitId: gId },
    });
    const product = await prisma.product.create({
      data: { recipeId: recipe.id, sellingPriceCents: 1000, minMarginPercent: 40, active: true },
    });

    const margins = await computeAllActiveProductMargins();

    expect(margins.has(product.id)).toBe(false);
  });

  it("does not include inactive products", async () => {
    const priced = await prisma.ingredient.create({
      data: { name: "CAAPM Priced", purchaseUnitId: kgId, purchaseQuantity: 1, recipeUnitId: gId },
    });
    await recordIngredientPrice(priced.id, 1000);
    const recipe = await prisma.recipe.create({
      data: { name: "CAAPM Inactive Recipe", standardYieldQty: 1, yieldUnitId: unitId },
    });
    await prisma.recipeLine.create({
      data: { recipeId: recipe.id, ingredientId: priced.id, quantity: 100, unitId: gId },
    });
    const product = await prisma.product.create({
      data: { recipeId: recipe.id, sellingPriceCents: 1000, minMarginPercent: 40, active: false },
    });

    const margins = await computeAllActiveProductMargins();

    expect(margins.has(product.id)).toBe(false);
  });
});
