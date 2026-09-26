import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps ordinary same-site paths, with query and hash", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/ideas")).toBe("/ideas");
    expect(safeNextPath("/ideas?cat=diet&tf=month")).toBe("/ideas?cat=diet&tf=month");
    expect(safeNextPath("/goals/abc#milestones")).toBe("/goals/abc#milestones");
  });

  it("falls back to / for missing or relative values", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("ideas")).toBe("/");
  });

  it("refuses absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("refuses the backslash and control-character bypasses browsers resolve off-site", () => {
    // Each of these passes a naive startsWith("/") && !startsWith("//") check,
    // but new URL() (and every browser) resolves them to https://evil.com/.
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("/\\/evil.com")).toBe("/");
    expect(safeNextPath("/\t/evil.com")).toBe("/");
    expect(safeNextPath("/\n/evil.com")).toBe("/");
    expect(safeNextPath("/\r/evil.com")).toBe("/");
  });

  it("refuses paths that only become protocol-relative after dot-segment normalisation", () => {
    expect(safeNextPath("/..//evil.com")).toBe("/");
    expect(safeNextPath("/./../..//evil.com/x")).toBe("/");
  });

  it("never returns anything that leaves the site", () => {
    const origin = "https://project-tau-self-69.vercel.app";
    const attempts = ["/\\evil.com", "/\t/evil.com", "//evil.com", "/%5Cevil.com", "/%2F%2Fevil.com", "/..//evil.com"];
    for (const a of attempts) {
      expect(new URL(safeNextPath(a), origin).origin, a).toBe(origin);
    }
  });
});
