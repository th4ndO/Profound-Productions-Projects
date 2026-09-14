import { describe, expect, it } from "vitest";
import {
  edibleUnitCostCents,
  purchaseUnitCostCents,
  recipeUnitCostCents,
} from "../ingredient";
import { InvalidPriceError, InvalidYieldError } from "../errors";

describe("purchaseUnitCostCents", () => {
  it("UT-01: R45,00 per 2,5 kg converts to 1,80c per gram", () => {
    const apCostPerKg = purchaseUnitCostCents(4500, 2.5);
    expect(apCostPerKg).toBe(1800); // cents per kg

    const costPerGram = recipeUnitCostCents(apCostPerKg, 1000); // kg -> g factor
    expect(costPerGram).toBeCloseTo(1.8, 10);
  });

  it("UT-22: a negative price throws InvalidPriceError, never divides silently", () => {
    expect(() => purchaseUnitCostCents(-100, 2.5)).toThrow(InvalidPriceError);
  });

  it("a purchase quantity of zero or less throws InvalidPriceError", () => {
    expect(() => purchaseUnitCostCents(4500, 0)).toThrow(InvalidPriceError);
    expect(() => purchaseUnitCostCents(4500, -1)).toThrow(InvalidPriceError);
  });
});

describe("edibleUnitCostCents", () => {
  it("UT-02: 1,80c/g at 95% yield gives 1,895c/g", () => {
    expect(edibleUnitCostCents(1.8, 95)).toBeCloseTo(1.895, 3);
  });

  it("UT-03: 100% yield returns the AP cost unchanged", () => {
    expect(edibleUnitCostCents(1.8, 100)).toBe(1.8);
  });

  it("UT-04: a yield of 0 throws InvalidYieldError and never divides by zero", () => {
    expect(() => edibleUnitCostCents(1.8, 0)).toThrow(InvalidYieldError);
  });

  it("UT-05: a yield above 100 throws InvalidYieldError", () => {
    expect(() => edibleUnitCostCents(1.8, 101)).toThrow(InvalidYieldError);
  });

  it("a negative yield throws InvalidYieldError", () => {
    expect(() => edibleUnitCostCents(1.8, -5)).toThrow(InvalidYieldError);
  });
});
