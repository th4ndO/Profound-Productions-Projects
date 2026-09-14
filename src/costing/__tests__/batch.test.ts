import { describe, expect, it } from "vitest";
import { purchaseList, scaleRecipe, scalingFactor } from "../batch";
import { InvalidYieldError } from "../errors";
import type { ConversionTable, IngredientRef, ResolvedRecipe } from "../types";

const conversions: ConversionTable = [
  { fromUnitId: "kg", toUnitId: "g", factor: 1000 },
];

describe("scalingFactor", () => {
  it("UT-18: 60 units from a 24-unit recipe scales by 2,5", () => {
    expect(scalingFactor(60, 24)).toBe(2.5);
  });

  it("rejects a zero or negative standard/desired yield", () => {
    expect(() => scalingFactor(10, 0)).toThrow(InvalidYieldError);
    expect(() => scalingFactor(0, 10)).toThrow(InvalidYieldError);
    expect(() => scalingFactor(-5, 10)).toThrow(InvalidYieldError);
  });
});

describe("scaleRecipe", () => {
  const recipe: ResolvedRecipe = {
    id: "r1",
    name: "Twenty-Four Unit Bake",
    standardYieldQty: 24,
    yieldUnitId: "unit",
    lines: [
      {
        quantity: 2,
        unitId: "kg",
        ingredient: { id: "flour", name: "Flour", recipeUnitId: "kg" },
      },
      {
        quantity: 500,
        unitId: "g",
        ingredient: { id: "sugar", name: "Sugar", recipeUnitId: "g" },
      },
    ],
  };

  it("UT-18: every line scales by the same factor (2,5) for 60 from 24", () => {
    const scaled = scaleRecipe(recipe, 60, conversions);
    const flour = scaled.find((l) => l.ingredientId === "flour")!;
    const sugar = scaled.find((l) => l.ingredientId === "sugar")!;
    expect(flour.quantity).toBeCloseTo(2 * 2.5, 10);
    expect(sugar.quantity).toBeCloseTo(500 * 2.5, 10);
  });

  it("UT-19: scaling preserves ingredient ratios exactly", () => {
    const unscaledRatio = 2 / (500 / 1000); // flour(kg) : sugar(kg)
    const scaled = scaleRecipe(recipe, 91, conversions);
    const flour = scaled.find((l) => l.ingredientId === "flour")!;
    const sugarInKg = scaled.find((l) => l.ingredientId === "sugar")!.quantity / 1000;
    const scaledRatio = flour.quantity / sugarInKg;
    expect(scaledRatio).toBeCloseTo(unscaledRatio, 9);
  });

  it("scales through a nested sub-recipe", () => {
    const nested: ResolvedRecipe = {
      id: "top",
      name: "Nested",
      standardYieldQty: 10,
      yieldUnitId: "unit",
      lines: [
        {
          quantity: 1,
          unitId: "kg",
          childRecipe: {
            id: "sub",
            name: "Sub",
            standardYieldQty: 2,
            yieldUnitId: "kg",
            lines: [
              {
                quantity: 1,
                unitId: "kg",
                ingredient: { id: "cocoa", name: "Cocoa", recipeUnitId: "kg" },
              },
            ],
          },
        },
      ],
    };
    // desired yield 20 => factor 2 at top level; line needs 1kg*2=2kg of sub
    // recipe, whose standard yield is 2kg => child factor 1 => cocoa stays 1kg.
    const scaled = scaleRecipe(nested, 20, conversions);
    expect(scaled).toHaveLength(1);
    expect(scaled[0]!.ingredientId).toBe("cocoa");
    expect(scaled[0]!.quantity).toBeCloseTo(1, 10);
  });
});

describe("purchaseList", () => {
  it("UT-20: needing 1,2 bags produces a purchase quantity of 2", () => {
    const ingredients: IngredientRef[] = [
      {
        id: "flour",
        name: "Flour",
        purchaseUnitId: "kg",
        purchaseQuantity: 5, // 5 kg per bag
        recipeUnitId: "kg",
        yieldPercent: 100,
      },
    ];
    // 6 kg needed at 100% yield => requiredAP = 6kg => 6 / 5 = 1.2 bags
    const scaled = [{ ingredientId: "flour", ingredientName: "Flour", quantity: 6, unitId: "kg" }];
    const list = purchaseList(scaled, ingredients, conversions);
    expect(list[0]!.packsToBuy).toBe(2);
  });

  it("corrects for yield loss before computing packs to buy", () => {
    const ingredients: IngredientRef[] = [
      {
        id: "carrots",
        name: "Carrots",
        purchaseUnitId: "kg",
        purchaseQuantity: 10,
        recipeUnitId: "kg",
        yieldPercent: 80, // 20% trim loss
      },
    ];
    // Need 8kg edible portion; AP required = 8 / 0.8 = 10kg => exactly 1 bag.
    const scaled = [{ ingredientId: "carrots", ingredientName: "Carrots", quantity: 8, unitId: "kg" }];
    const list = purchaseList(scaled, ingredients, conversions);
    expect(list[0]!.requiredApQuantity).toBeCloseTo(10, 9);
    expect(list[0]!.packsToBuy).toBe(1);
  });

  it("aggregates the same ingredient from multiple scaled lines before rounding up", () => {
    const ingredients: IngredientRef[] = [
      {
        id: "butter",
        name: "Butter",
        purchaseUnitId: "kg",
        purchaseQuantity: 1,
        recipeUnitId: "g",
        yieldPercent: 100,
      },
    ];
    const scaled = [
      { ingredientId: "butter", ingredientName: "Butter", quantity: 400, unitId: "g" },
      { ingredientId: "butter", ingredientName: "Butter", quantity: 300, unitId: "g" },
    ];
    // Aggregated 700g = 0.7kg required => rounds up to 1 pack, not 2.
    const list = purchaseList(scaled, ingredients, conversions);
    expect(list).toHaveLength(1);
    expect(list[0]!.packsToBuy).toBe(1);
  });

  it("converts recipe-unit requirements into purchase units before dividing", () => {
    const ingredients: IngredientRef[] = [
      {
        id: "salt",
        name: "Salt",
        purchaseUnitId: "kg",
        purchaseQuantity: 1,
        recipeUnitId: "g",
        yieldPercent: 100,
      },
    ];
    const scaled = [{ ingredientId: "salt", ingredientName: "Salt", quantity: 2500, unitId: "g" }];
    const list = purchaseList(scaled, ingredients, conversions);
    expect(list[0]!.requiredApQuantity).toBeCloseTo(2.5, 9); // in kg, the purchase unit
    expect(list[0]!.packsToBuy).toBe(3);
  });
});
