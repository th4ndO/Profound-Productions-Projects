/**
 * Idempotent seed script for a generic small bakery — no real business's
 * product names, recipes or branding. Safe to run more than once: units,
 * ingredients, recipes, products and users are upserted on their unique
 * field; recipe lines and price history are only inserted the first time
 * (checked by presence, since neither has a natural unique key to upsert
 * on) so re-running never duplicates rows.
 *
 * Also seeds two standing demo fixtures used by the README's "verifying
 * the core invariants" walkthrough: an ingredient with no price row at all
 * (INV-1) and a batch already taken through to COSTED (INV-3), frozen with
 * the same freezeBatchCosting() the app itself uses on that transition —
 * not a hand-rolled copy of its logic.
 *
 * Run with `npm run seed`.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { freezeBatchCosting } from "../src/lib/costing-db";

const SEED_PASSWORD = "Password123!";

async function upsertUnit(name: string, symbol: string, measureType: "MASS" | "VOLUME" | "COUNT") {
  return prisma.unit.upsert({
    where: { symbol },
    update: { name, measureType },
    create: { name, symbol, measureType },
  });
}

async function ensureConversion(fromUnitId: string, toUnitId: string, factor: number) {
  await prisma.unitConversion.upsert({
    where: { fromUnitId_toUnitId: { fromUnitId, toUnitId } },
    update: { factor },
    create: { fromUnitId, toUnitId, factor },
  });
}

interface IngredientSeed {
  name: string;
  purchaseUnitId: string;
  purchaseQuantity: number;
  recipeUnitId: string;
  yieldPercent?: number;
  supplier?: string;
  /** One or more historical price rows, oldest first. */
  prices: Array<{ priceCents: number; effectiveFrom: Date; source?: string }>;
}

async function upsertIngredient(seed: IngredientSeed) {
  const ingredient = await prisma.ingredient.upsert({
    where: { name: seed.name },
    update: {
      purchaseUnitId: seed.purchaseUnitId,
      purchaseQuantity: seed.purchaseQuantity,
      recipeUnitId: seed.recipeUnitId,
      yieldPercent: seed.yieldPercent ?? 100,
      supplier: seed.supplier,
    },
    create: {
      name: seed.name,
      purchaseUnitId: seed.purchaseUnitId,
      purchaseQuantity: seed.purchaseQuantity,
      recipeUnitId: seed.recipeUnitId,
      yieldPercent: seed.yieldPercent ?? 100,
      supplier: seed.supplier,
    },
  });

  const existingPriceCount = await prisma.ingredientPrice.count({
    where: { ingredientId: ingredient.id },
  });
  if (existingPriceCount === 0) {
    for (const price of seed.prices) {
      // IngredientPrice is append-only by design (see schema comment) — the
      // seed only ever creates, never updates/deletes, and only does so
      // once (guarded by existingPriceCount === 0 above) so re-running the
      // seed does not fabricate new history.
      await prisma.ingredientPrice.create({
        data: {
          ingredientId: ingredient.id,
          priceCents: price.priceCents,
          effectiveFrom: price.effectiveFrom,
          source: price.source,
        },
      });
    }
  }

  return ingredient;
}

interface RecipeLineSeed {
  ingredientName?: string;
  childRecipeName?: string;
  quantity: number;
  unitId: string;
}

async function upsertRecipe(
  name: string,
  standardYieldQty: number,
  yieldUnitId: string,
  incidentalsRate: number,
  isSubRecipe: boolean,
  lines: RecipeLineSeed[],
  ingredientIdByName: Map<string, string>,
  recipeIdByName: Map<string, string>,
) {
  const recipe = await prisma.recipe.upsert({
    where: { name },
    update: { standardYieldQty, yieldUnitId, incidentalsRate, isSubRecipe },
    create: { name, standardYieldQty, yieldUnitId, incidentalsRate, isSubRecipe },
  });
  recipeIdByName.set(name, recipe.id);

  const existingLineCount = await prisma.recipeLine.count({ where: { recipeId: recipe.id } });
  if (existingLineCount === 0) {
    for (const line of lines) {
      const ingredientId = line.ingredientName
        ? (ingredientIdByName.get(line.ingredientName) ??
          (() => {
            throw new Error(`seed: unknown ingredient "${line.ingredientName}"`);
          })())
        : null;
      const childRecipeId = line.childRecipeName
        ? (recipeIdByName.get(line.childRecipeName) ??
          (() => {
            throw new Error(`seed: unknown recipe "${line.childRecipeName}"`);
          })())
        : null;
      await prisma.recipeLine.create({
        data: {
          recipeId: recipe.id,
          ingredientId,
          childRecipeId,
          quantity: line.quantity,
          unitId: line.unitId,
        },
      });
    }
  }

  return recipe;
}

async function upsertProduct(
  recipeName: string,
  sellingPriceCents: number,
  minMarginPercent: number,
  recipeIdByName: Map<string, string>,
) {
  const recipeId = recipeIdByName.get(recipeName);
  if (!recipeId) {
    throw new Error(`seed: unknown recipe "${recipeName}" for product`);
  }
  await prisma.product.upsert({
    where: { recipeId },
    update: { sellingPriceCents, minMarginPercent, active: true },
    create: { recipeId, sellingPriceCents, minMarginPercent, active: true },
  });
}

async function upsertUser(email: string, role: string) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, passwordHash, role },
  });
}

async function main() {
  // --- Units ---------------------------------------------------------
  const kg = await upsertUnit("kilogram", "kg", "MASS");
  const g = await upsertUnit("gram", "g", "MASS");
  const L = await upsertUnit("litre", "L", "VOLUME");
  const mL = await upsertUnit("millilitre", "mL", "VOLUME");
  const unit = await upsertUnit("unit", "unit", "COUNT");

  await ensureConversion(kg.id, g.id, 1000);
  await ensureConversion(L.id, mL.id, 1000);

  // --- Ingredients -----------------------------------------------------
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const ingredientSeeds: IngredientSeed[] = [
    {
      name: "Cake Flour",
      purchaseUnitId: kg.id,
      purchaseQuantity: 12.5,
      recipeUnitId: g.id,
      supplier: "Generic Milling Co",
      prices: [
        { priceCents: 18750, effectiveFrom: sixtyDaysAgo, source: "Generic Milling Co invoice #1042" },
        { priceCents: 20000, effectiveFrom: now, source: "Generic Milling Co invoice #1198" },
      ],
    },
    {
      name: "White Sugar",
      purchaseUnitId: kg.id,
      purchaseQuantity: 10,
      recipeUnitId: g.id,
      supplier: "Sweetline Distributors",
      prices: [{ priceCents: 15000, effectiveFrom: now, source: "Sweetline Distributors invoice" }],
    },
    {
      name: "Unsalted Butter",
      purchaseUnitId: kg.id,
      purchaseQuantity: 5,
      recipeUnitId: g.id,
      supplier: "Dairy Basics",
      prices: [{ priceCents: 42500, effectiveFrom: now, source: "Dairy Basics invoice" }],
    },
    {
      name: "Free-range Eggs",
      purchaseUnitId: unit.id,
      purchaseQuantity: 30,
      recipeUnitId: unit.id,
      supplier: "Local Farm Co-op",
      prices: [{ priceCents: 11400, effectiveFrom: now, source: "Local Farm Co-op invoice" }],
    },
    {
      name: "Whole Milk",
      purchaseUnitId: L.id,
      purchaseQuantity: 20,
      recipeUnitId: mL.id,
      supplier: "Dairy Basics",
      prices: [{ priceCents: 38000, effectiveFrom: now, source: "Dairy Basics invoice" }],
    },
    {
      name: "Vanilla Extract",
      purchaseUnitId: mL.id,
      purchaseQuantity: 500,
      recipeUnitId: mL.id,
      supplier: "Flavour House",
      prices: [{ priceCents: 22000, effectiveFrom: now, source: "Flavour House invoice" }],
    },
    {
      name: "Fresh Carrots",
      purchaseUnitId: kg.id,
      purchaseQuantity: 10,
      recipeUnitId: g.id,
      yieldPercent: 80, // peel/trim loss
      supplier: "Greenfield Produce",
      prices: [{ priceCents: 9500, effectiveFrom: now, source: "Greenfield Produce invoice" }],
    },
    {
      name: "Baking Powder",
      purchaseUnitId: g.id,
      purchaseQuantity: 200,
      recipeUnitId: g.id,
      supplier: "Pantry Supplies Ltd",
      prices: [{ priceCents: 2800, effectiveFrom: now, source: "Pantry Supplies Ltd invoice" }],
    },
    {
      name: "Table Salt",
      purchaseUnitId: kg.id,
      purchaseQuantity: 1,
      recipeUnitId: g.id,
      supplier: "Pantry Supplies Ltd",
      prices: [{ priceCents: 1200, effectiveFrom: now, source: "Pantry Supplies Ltd invoice" }],
    },
    {
      // Deliberately priceless — a standing fixture for the README's INV-1
      // walkthrough. Never gets a price row from this seed (prices: []), so
      // any recipe that uses it always demonstrates MissingPriceError.
      name: "Specialty Cocoa Nibs",
      purchaseUnitId: kg.id,
      purchaseQuantity: 1,
      recipeUnitId: g.id,
      supplier: "Flavour House",
      prices: [],
    },
  ];

  const ingredientIdByName = new Map<string, string>();
  for (const seed of ingredientSeeds) {
    const ingredient = await upsertIngredient(seed);
    ingredientIdByName.set(seed.name, ingredient.id);
  }

  // --- Recipes -----------------------------------------------------------
  const recipeIdByName = new Map<string, string>();

  // Sub-recipe consumed by two parent recipes.
  await upsertRecipe(
    "Vanilla Sponge Base",
    1,
    kg.id,
    0,
    true,
    [
      { ingredientName: "Cake Flour", quantity: 500, unitId: g.id },
      { ingredientName: "White Sugar", quantity: 400, unitId: g.id },
      { ingredientName: "Unsalted Butter", quantity: 100, unitId: g.id },
      { ingredientName: "Free-range Eggs", quantity: 2, unitId: unit.id },
    ],
    ingredientIdByName,
    recipeIdByName,
  );

  await upsertRecipe(
    "Classic Vanilla Cake",
    12,
    unit.id,
    5,
    false,
    [
      { childRecipeName: "Vanilla Sponge Base", quantity: 1, unitId: kg.id },
      { ingredientName: "Whole Milk", quantity: 200, unitId: mL.id },
      { ingredientName: "Baking Powder", quantity: 10, unitId: g.id },
    ],
    ingredientIdByName,
    recipeIdByName,
  );

  await upsertRecipe(
    "Vanilla Cupcakes",
    24,
    unit.id,
    8,
    false,
    [
      { childRecipeName: "Vanilla Sponge Base", quantity: 0.5, unitId: kg.id },
      { ingredientName: "Vanilla Extract", quantity: 10, unitId: mL.id },
    ],
    ingredientIdByName,
    recipeIdByName,
  );

  await upsertRecipe(
    "Carrot Muffins",
    12,
    unit.id,
    6,
    false,
    [
      { ingredientName: "Fresh Carrots", quantity: 300, unitId: g.id },
      { ingredientName: "Cake Flour", quantity: 400, unitId: g.id },
      { ingredientName: "White Sugar", quantity: 200, unitId: g.id },
      { ingredientName: "Free-range Eggs", quantity: 2, unitId: unit.id },
      { ingredientName: "Table Salt", quantity: 5, unitId: g.id },
    ],
    ingredientIdByName,
    recipeIdByName,
  );

  // Standing INV-1 demo fixture: this recipe can never be costed, because
  // Specialty Cocoa Nibs above never gets a price row. Opening it always
  // shows the MissingPriceError banner rather than a zero total.
  await upsertRecipe(
    "Demo: Missing Price",
    1,
    unit.id,
    0,
    false,
    [{ ingredientName: "Specialty Cocoa Nibs", quantity: 50, unitId: g.id }],
    ingredientIdByName,
    recipeIdByName,
  );

  // --- Products ------------------------------------------------------
  await upsertProduct("Classic Vanilla Cake", 1500, 40, recipeIdByName);
  await upsertProduct("Vanilla Cupcakes", 1800, 45, recipeIdByName);
  await upsertProduct("Carrot Muffins", 2200, 40, recipeIdByName);

  // --- Users, one per role ---------------------------------------------
  await upsertUser("admin@bakery.local", "ADMIN");
  await upsertUser("production@bakery.local", "PRODUCTION");
  await upsertUser("buyer@bakery.local", "BUYER");

  // Standing INV-3 demo fixture: a batch already taken through to COSTED,
  // frozen with the app's own freezeBatchCosting() — not a hand-rolled
  // copy of it — so its stored cost is ready to compare against a live
  // recipe cost after a price change, with no lifecycle clicking required.
  const vanillaCakeRecipeId = recipeIdByName.get("Classic Vanilla Cake");
  if (vanillaCakeRecipeId) {
    const existingCostedBatch = await prisma.batch.findFirst({
      where: { recipeId: vanillaCakeRecipeId, status: "COSTED" },
    });
    if (!existingCostedBatch) {
      const demoBatch = await prisma.batch.create({
        data: {
          recipeId: vanillaCakeRecipeId,
          targetYield: 12,
          plannedFor: now,
          status: "PLANNED",
        },
      });
      await freezeBatchCosting(demoBatch.id);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
