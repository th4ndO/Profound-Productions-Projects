/**
 * Dedicated coverage for the database-level half of the RecipeLine XOR
 * constraint (see prisma/migrations/20260914110008_recipe_line_xor_check).
 * The application layer (addLineAction) already refuses to submit a line
 * missing both/neither reference, but the build spec is explicit that the
 * XOR must ALSO be enforced as a SQLite CHECK-equivalent — this proves the
 * database itself rejects a bad row even if application code were bypassed
 * entirely (a raw INSERT, a bug, a future caller), by writing raw SQL
 * directly against the temporary database rather than going through
 * Prisma's typed client (which itself would refuse a request shaped like
 * this at the TypeScript level).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./db-harness";
import type { PrismaClient } from "@prisma/client";

let testDb: TestDatabase;
let prisma: PrismaClient;
let recipeId: string;
let ingredientId: string;
let unitId: string;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  const { prisma: client } = await import("@/lib/db");
  prisma = client;

  const unit = await prisma.unit.create({ data: { name: "unit", symbol: "unit", measureType: "COUNT" } });
  unitId = unit.id;
  const ingredient = await prisma.ingredient.create({
    data: { name: "XOR Test Ingredient", purchaseUnitId: unit.id, purchaseQuantity: 1, recipeUnitId: unit.id },
  });
  ingredientId = ingredient.id;
  const recipe = await prisma.recipe.create({
    data: { name: "XOR Test Recipe", standardYieldQty: 1, yieldUnitId: unit.id },
  });
  recipeId = recipe.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  testDb.cleanup();
});

describe("recipe_lines XOR triggers", () => {
  it("rejects a raw INSERT with neither ingredientId nor childRecipeId", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO recipe_lines (id, recipeId, ingredientId, childRecipeId, quantity, unitId)
         VALUES ('xor-neither', ?, NULL, NULL, 1, ?)`,
        recipeId,
        unitId,
      ),
    ).rejects.toThrow();
  });

  it("rejects a raw INSERT with both ingredientId and childRecipeId", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO recipe_lines (id, recipeId, ingredientId, childRecipeId, quantity, unitId)
         VALUES ('xor-both', ?, ?, ?, 1, ?)`,
        recipeId,
        ingredientId,
        recipeId,
        unitId,
      ),
    ).rejects.toThrow();
  });

  it("accepts a raw INSERT with exactly one of the two set, and rejects an UPDATE that breaks the XOR", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO recipe_lines (id, recipeId, ingredientId, childRecipeId, quantity, unitId)
       VALUES ('xor-valid', ?, ?, NULL, 1, ?)`,
      recipeId,
      ingredientId,
      unitId,
    );
    const line = await prisma.recipeLine.findUnique({ where: { id: "xor-valid" } });
    expect(line).not.toBeNull();

    await expect(
      prisma.$executeRawUnsafe(`UPDATE recipe_lines SET ingredientId = NULL WHERE id = 'xor-valid'`),
    ).rejects.toThrow();

    // The row is untouched — the trigger aborted the whole statement.
    const unchanged = await prisma.recipeLine.findUnique({ where: { id: "xor-valid" } });
    expect(unchanged?.ingredientId).toBe(ingredientId);
  });
});
