import { describe, expect, it } from "vitest";
import { applyIncidentals, costRecipe, detectCycle } from "../recipe";
import { CircularRecipeError, MissingPriceError } from "../errors";
import type {
  ConversionTable,
  IngredientCostInput,
  RecipeContext,
  RecipeInput,
} from "../types";

const conversions: ConversionTable = [
  { fromUnitId: "kg", toUnitId: "g", factor: 1000 },
];

/** Build a RecipeContext from plain arrays, the way the application layer
 * would after loading rows from Prisma. */
function buildContext(
  recipes: RecipeInput[],
  ingredients: IngredientCostInput[],
): RecipeContext {
  return {
    recipes: new Map(recipes.map((r) => [r.id, r])),
    ingredients: new Map(ingredients.map((i) => [i.id, i])),
    conversions,
  };
}

function ingredient(
  overrides: Partial<IngredientCostInput> & { id: string; name: string },
): IngredientCostInput {
  return {
    purchaseUnitId: "kg",
    purchaseQuantity: 1,
    recipeUnitId: "kg",
    yieldPercent: 100,
    priceCents: 0,
    ...overrides,
  };
}

describe("applyIncidentals", () => {
  it("UT-08: 8% incidentals on R12,50 gives R13,50", () => {
    expect(applyIncidentals(1250, 8)).toBe(1350);
  });

  it("0% incidentals leaves the cost unchanged", () => {
    expect(applyIncidentals(1250, 0)).toBe(1250);
  });
});

describe("costRecipe — simple recipes", () => {
  it("UT-06: a three-line recipe totals exactly, to the cent", () => {
    const ingredients = [
      ingredient({ id: "a", name: "Flour", purchaseQuantity: 2, priceCents: 2000 }), // R10/kg
      ingredient({ id: "b", name: "Sugar", purchaseQuantity: 1, priceCents: 500 }), // R5/kg
      ingredient({
        id: "c",
        name: "Eggs",
        purchaseUnitId: "unit",
        purchaseQuantity: 12,
        recipeUnitId: "unit",
        priceCents: 1200,
      }), // R1/unit
    ];
    const recipe: RecipeInput = {
      id: "r1",
      name: "Three Line Bake",
      standardYieldQty: 10,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [
        { id: "l1", ingredientId: "a", childRecipeId: null, quantity: 1, unitId: "kg" }, // 1000c
        { id: "l2", ingredientId: "b", childRecipeId: null, quantity: 0.5, unitId: "kg" }, // 250c
        { id: "l3", ingredientId: "c", childRecipeId: null, quantity: 3, unitId: "unit" }, // 300c
      ],
    };
    const ctx = buildContext([recipe], ingredients);
    const result = costRecipe("r1", ctx);
    expect(result.totalCents).toBe(1550);
  });

  it("UT-07: cost per unit equals total divided by standard yield", () => {
    const ingredients = [ingredient({ id: "a", name: "Flour", priceCents: 1000 })];
    const recipe: RecipeInput = {
      id: "r1",
      name: "Even Split",
      standardYieldQty: 10,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [{ id: "l1", ingredientId: "a", childRecipeId: null, quantity: 1, unitId: "kg" }],
    };
    const ctx = buildContext([recipe], ingredients);
    const result = costRecipe("r1", ctx);
    expect(result.unitCents).toBe(result.totalCents / 10);
  });

  it("UT-13: an ingredient with no price row throws MissingPriceError", () => {
    const ingredients = [
      ingredient({ id: "a", name: "Vanilla Extract", priceCents: null }),
    ];
    const recipe: RecipeInput = {
      id: "r1",
      name: "Missing Price",
      standardYieldQty: 1,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [{ id: "l1", ingredientId: "a", childRecipeId: null, quantity: 1, unitId: "kg" }],
    };
    const ctx = buildContext([recipe], ingredients);
    expect(() => costRecipe("r1", ctx)).toThrow(MissingPriceError);
    expect(() => costRecipe("r1", ctx)).toThrow(/"Vanilla Extract"/);
  });

  it("UT-14: an incompatible unit on a recipe line throws MissingConversionError", () => {
    const ingredients = [ingredient({ id: "a", name: "Milk", priceCents: 1000 })];
    const recipe: RecipeInput = {
      id: "r1",
      name: "Bad Unit",
      standardYieldQty: 1,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [{ id: "l1", ingredientId: "a", childRecipeId: null, quantity: 1, unitId: "L" }],
    };
    const ctx = buildContext([recipe], ingredients);
    expect(() => costRecipe("r1", ctx)).toThrow(/no unit conversion/);
  });
});

describe("costRecipe — sub-recipes", () => {
  it("UT-09: consuming 200 g of a 1 kg sub-recipe charges 20% of its cost", () => {
    const ingredients = [ingredient({ id: "d", name: "Butter", priceCents: 10000 })]; // R100/kg
    const subA: RecipeInput = {
      id: "sub",
      name: "Sub A",
      standardYieldQty: 1,
      yieldUnitId: "kg",
      incidentalsRate: 0,
      lines: [{ id: "sl1", ingredientId: "d", childRecipeId: null, quantity: 1, unitId: "kg" }],
    };
    const parent: RecipeInput = {
      id: "parent",
      name: "Parent A",
      standardYieldQty: 1,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [{ id: "pl1", ingredientId: null, childRecipeId: "sub", quantity: 200, unitId: "g" }],
    };
    const ctx = buildContext([subA, parent], ingredients);
    const subCost = costRecipe("sub", ctx);
    const parentCost = costRecipe("parent", ctx);
    expect(subCost.totalCents).toBe(10000);
    expect(parentCost.totalCents).toBe(2000); // 20% of 10000
  });

  it("UT-10: two-level nesting (A -> B -> C) rolls up correctly", () => {
    const ingredients = [ingredient({ id: "e", name: "Cocoa", priceCents: 5000 })]; // R50/kg
    const recipeC: RecipeInput = {
      id: "c",
      name: "C",
      standardYieldQty: 1,
      yieldUnitId: "kg",
      incidentalsRate: 0,
      lines: [{ id: "cl1", ingredientId: "e", childRecipeId: null, quantity: 1, unitId: "kg" }],
    };
    const recipeB: RecipeInput = {
      id: "b",
      name: "B",
      standardYieldQty: 1,
      yieldUnitId: "kg",
      incidentalsRate: 0,
      lines: [{ id: "bl1", ingredientId: null, childRecipeId: "c", quantity: 1, unitId: "kg" }],
    };
    const recipeA: RecipeInput = {
      id: "a",
      name: "A",
      standardYieldQty: 2,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [{ id: "al1", ingredientId: null, childRecipeId: "b", quantity: 0.5, unitId: "kg" }],
    };
    const ctx = buildContext([recipeA, recipeB, recipeC], ingredients);
    expect(costRecipe("c", ctx).totalCents).toBe(5000);
    expect(costRecipe("b", ctx).totalCents).toBe(5000); // ratio 1/1
    expect(costRecipe("a", ctx).totalCents).toBe(2500); // ratio 0.5/1 of B's 5000
  });
});

describe("detectCycle / CircularRecipeError", () => {
  it("UT-12: A -> A throws CircularRecipeError", () => {
    const recipeA: RecipeInput = {
      id: "a",
      name: "A",
      standardYieldQty: 1,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [{ id: "al1", ingredientId: null, childRecipeId: "a", quantity: 1, unitId: "unit" }],
    };
    const ctx = buildContext([recipeA], []);
    expect(detectCycle("a", ctx)).toEqual(["a", "a"]);
    expect(() => costRecipe("a", ctx)).toThrow(CircularRecipeError);
  });

  it("UT-11: A -> B -> A throws CircularRecipeError with the cycle path", () => {
    const recipeA: RecipeInput = {
      id: "a",
      name: "A",
      standardYieldQty: 1,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [{ id: "al1", ingredientId: null, childRecipeId: "b", quantity: 1, unitId: "unit" }],
    };
    const recipeB: RecipeInput = {
      id: "b",
      name: "B",
      standardYieldQty: 1,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [{ id: "bl1", ingredientId: null, childRecipeId: "a", quantity: 1, unitId: "unit" }],
    };
    const ctx = buildContext([recipeA, recipeB], []);
    expect(detectCycle("a", ctx)).toEqual(["a", "b", "a"]);
    try {
      costRecipe("a", ctx);
      expect.unreachable("costRecipe should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CircularRecipeError);
      expect((err as CircularRecipeError).cyclePath).toEqual(["A", "B", "A"]);
    }
  });

  it("never stack-overflows on a cycle — detectCycle terminates on any graph", () => {
    // A chain of 500 recipes each pointing to the next, with the last
    // pointing back to the first, would blow a naive unbounded recursion.
    const recipes: RecipeInput[] = [];
    const count = 500;
    for (let i = 0; i < count; i++) {
      const nextId = i === count - 1 ? "r0" : `r${i + 1}`;
      recipes.push({
        id: `r${i}`,
        name: `R${i}`,
        standardYieldQty: 1,
        yieldUnitId: "unit",
        incidentalsRate: 0,
        lines: [{ id: `l${i}`, ingredientId: null, childRecipeId: nextId, quantity: 1, unitId: "unit" }],
      });
    }
    const ctx = buildContext(recipes, []);
    expect(() => detectCycle("r0", ctx)).not.toThrow();
    expect(detectCycle("r0", ctx)).not.toBeNull();
  });

  it("does not flag a diamond re-use of the same sub-recipe as a cycle", () => {
    const ingredients = [ingredient({ id: "f", name: "Flour", priceCents: 1000 })];
    const shared: RecipeInput = {
      id: "shared",
      name: "Shared Base",
      standardYieldQty: 1,
      yieldUnitId: "kg",
      incidentalsRate: 0,
      lines: [{ id: "sl1", ingredientId: "f", childRecipeId: null, quantity: 1, unitId: "kg" }],
    };
    const top: RecipeInput = {
      id: "top",
      name: "Top",
      standardYieldQty: 1,
      yieldUnitId: "unit",
      incidentalsRate: 0,
      lines: [
        { id: "tl1", ingredientId: null, childRecipeId: "shared", quantity: 1, unitId: "kg" },
        { id: "tl2", ingredientId: null, childRecipeId: "shared", quantity: 1, unitId: "kg" },
      ],
    };
    const ctx = buildContext([top, shared], ingredients);
    expect(detectCycle("top", ctx)).toBeNull();
    expect(() => costRecipe("top", ctx)).not.toThrow();
  });
});

describe("costRecipe — stability", () => {
  it("UT-21: 1000 sequential recalculations drift by less than one cent", () => {
    const ingredients = [
      ingredient({ id: "a", name: "Flour", purchaseQuantity: 2.5, priceCents: 4500, yieldPercent: 95 }),
      ingredient({ id: "b", name: "Butter", purchaseQuantity: 1, priceCents: 8700 }),
    ];
    const sub: RecipeInput = {
      id: "sub",
      name: "Filling",
      standardYieldQty: 3,
      yieldUnitId: "kg",
      incidentalsRate: 5,
      lines: [
        { id: "sl1", ingredientId: "a", childRecipeId: null, quantity: 1.2, unitId: "kg" },
        { id: "sl2", ingredientId: "b", childRecipeId: null, quantity: 0.4, unitId: "kg" },
      ],
    };
    const top: RecipeInput = {
      id: "top",
      name: "Cake",
      standardYieldQty: 24,
      yieldUnitId: "unit",
      incidentalsRate: 8,
      lines: [
        { id: "tl1", ingredientId: "b", childRecipeId: null, quantity: 0.6, unitId: "kg" },
        { id: "tl2", ingredientId: null, childRecipeId: "sub", quantity: 900, unitId: "g" },
      ],
    };
    const ctx = buildContext([top, sub], ingredients);

    const totals: number[] = [];
    for (let i = 0; i < 1000; i++) {
      totals.push(costRecipe("top", ctx).totalCents);
    }
    const drift = Math.max(...totals) - Math.min(...totals);
    expect(drift).toBeLessThan(1);
  });
});
