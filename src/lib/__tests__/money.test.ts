import { describe, expect, it } from "vitest";
import { formatPercent, formatRand } from "../money";

describe("formatRand", () => {
  it("formats a thousands-separated amount as R1 234,56", () => {
    expect(formatRand(123456)).toBe("R1 234,56");
  });

  it("formats an amount under a thousand with no separator", () => {
    expect(formatRand(1500)).toBe("R15,00");
  });

  it("pads a single-digit cents value to two digits", () => {
    expect(formatRand(309)).toBe("R3,09");
  });

  it("formats zero as R0,00", () => {
    expect(formatRand(0)).toBe("R0,00");
  });

  it("formats a negative amount with a leading minus before the R", () => {
    expect(formatRand(-500)).toBe("-R5,00");
  });

  it("separates every group of three digits for large amounts", () => {
    expect(formatRand(123456789)).toBe("R1 234 567,89");
  });
});

describe("formatPercent", () => {
  it("formats to one decimal place with a comma", () => {
    expect(formatPercent(46)).toBe("46,0%");
    expect(formatPercent(79.4)).toBe("79,4%");
  });

  it("rounds to one decimal place", () => {
    expect(formatPercent(20.649)).toBe("20,6%");
  });
});
