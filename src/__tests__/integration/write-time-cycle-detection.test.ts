/**
 * INV-2, "detect on write": coverage for wouldCreateCycle in
 * src/lib/costing-db.ts specifically — the bridge-layer function
 * addLineAction calls before ever writing a proposed sub-recipe line to
 * the database. The pure detectCycle algorithm itself is already covered
 * thoroughly in src/costing/__tests__/recipe.test.ts; this test instead
 * proves the *database-backed* wrapper correctly builds the hypothetical
 * graph (existing lines + the one proposed line) from real Prisma rows
 * and asks the right question of it.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./db-harness";
import type { PrismaClient } from "@prisma/client";

let testDb: TestDatabase;
let prisma: PrismaClient;
let wouldCreateCycle: typeof import("@/lib/costing-db").wouldCreateCycle;

let unitId: string;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  const dbModule = await import("@/lib/db");
  const costingDbModule = await import("@/lib/costing-db");
  prisma = dbModule.prisma;
  ({ wouldCreateCycle } = costingDbModule);

  const unit = await prisma.unit.create({ data: { name: "unit", symbol: "unit", measureType: "COUNT" } });
  unitId = unit.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  testDb.cleanup();
});

describe("wouldCreateCycle", () => {
  it("returns null for a proposed line that introduces no cycle", async () => {
    const a = await prisma.recipe.create({ data: { name: "WCC A", standardYieldQty: 1, yieldUnitId: unitId } });
    const b = await prisma.recipe.create({ data: { name: "WCC B", standardYieldQty: 1, yieldUnitId: unitId } });

    expect(await wouldCreateCycle(a.id, b.id)).toBeNull();
  });

  it("detects a direct self-reference before it is written", async () => {
    const a = await prisma.recipe.create({ data: { name: "WCC Self", standardYieldQty: 1, yieldUnitId: unitId } });

    const cycle = await wouldCreateCycle(a.id, a.id);

    expect(cycle).toEqual(["WCC Self", "WCC Self"]);
    // Nothing was actually written — the recipe still has no lines.
    const lineCount = await prisma.recipeLine.count({ where: { recipeId: a.id } });
    expect(lineCount).toBe(0);
  });

  it("detects an indirect cycle through an existing line already in the database", async () => {
    const a = await prisma.recipe.create({ data: { name: "WCC Indirect A", standardYieldQty: 1, yieldUnitId: unitId } });
    const b = await prisma.recipe.create({ data: { name: "WCC Indirect B", standardYieldQty: 1, yieldUnitId: unitId } });
    // B already contains A as a sub-recipe line (a prior, legitimate write).
    await prisma.recipeLine.create({
      data: { recipeId: b.id, childRecipeId: a.id, quantity: 1, unitId },
    });

    // Now propose adding B as a sub-recipe of A — this would close the loop.
    const cycle = await wouldCreateCycle(a.id, b.id);

    expect(cycle).toEqual(["WCC Indirect A", "WCC Indirect B", "WCC Indirect A"]);
  });
});
