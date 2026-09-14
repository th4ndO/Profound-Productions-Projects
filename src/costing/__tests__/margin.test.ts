import { describe, expect, it } from "vitest";
import { foodCostPercent, marginPercent, suggestedPriceCents } from "../margin";
import { InvalidPriceError } from "../errors";

describe("marginPercent / foodCostPercent", () => {
  it("UT-15: cost R13,50 at price R25,00 gives 46,0% margin, 54,0% food cost", () => {
    expect(marginPercent(1350, 2500)).toBeCloseTo(46.0, 5);
    expect(foodCostPercent(1350, 2500)).toBeCloseTo(54.0, 5);
  });

  it("UT-16: margin % + food cost % equals 100 for any valid pair", () => {
    const pairs: Array<[number, number]> = [
      [1350, 2500],
      [500, 500],
      [1, 1000000],
      [999, 1000],
      [12345, 54321],
    ];
    for (const [cost, price] of pairs) {
      const sum = marginPercent(cost, price) + foodCostPercent(cost, price);
      expect(sum).toBeCloseTo(100, 9);
    }
  });

  it("rejects a zero or negative selling price rather than dividing by zero", () => {
    expect(() => marginPercent(100, 0)).toThrow(InvalidPriceError);
    expect(() => foodCostPercent(100, -5)).toThrow(InvalidPriceError);
  });
});

describe("suggestedPriceCents", () => {
  it("UT-17: cost R13,50 at a 35% target suggests R38,57", () => {
    expect(suggestedPriceCents(1350, 35)).toBe(3857);
  });

  it("throws InvalidPriceError instead of dividing by a zero target", () => {
    expect(() => suggestedPriceCents(1350, 0)).toThrow(InvalidPriceError);
    expect(() => suggestedPriceCents(1350, -10)).toThrow(InvalidPriceError);
  });
});
