import { describe, expect, it } from "vitest";
import { isValidTimeZone } from "./timezone";

describe("isValidTimeZone", () => {
  it("accepts IANA zones", () => {
    expect(isValidTimeZone("Africa/Johannesburg")).toBe(true);
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects blank and unknown zones", () => {
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("   ")).toBe(false);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("Johannesburg")).toBe(false);
  });
});
