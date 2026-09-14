import { describe, expect, it } from "vitest";
import { convert } from "../units";
import { MissingConversionError } from "../errors";
import type { ConversionTable } from "../types";

const table: ConversionTable = [
  { fromUnitId: "kg", toUnitId: "g", factor: 1000 },
  { fromUnitId: "L", toUnitId: "mL", factor: 1000 },
];

describe("convert", () => {
  it("returns the quantity unchanged when converting a unit to itself", () => {
    expect(convert(5, "kg", "kg", table)).toBe(5);
  });

  it("applies the direct factor for a forward conversion", () => {
    expect(convert(2, "kg", "g", table)).toBe(2000);
  });

  it("UT-14: resolves the inverse conversion when only the forward row is stored", () => {
    expect(convert(2500, "g", "kg", table)).toBeCloseTo(2.5, 10);
  });

  it("UT-14: throws MissingConversionError for incompatible units", () => {
    expect(() => convert(1, "kg", "L", table)).toThrow(MissingConversionError);
  });

  it("names the offending units in the error message", () => {
    expect(() => convert(1, "kg", "L", table)).toThrow(/"kg".*"L"/);
  });
});
