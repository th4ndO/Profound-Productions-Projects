import { describe, expect, it } from "vitest";
import { categorizeTransaction } from "../categorize";
import type { CategoryRuleTable } from "../types";

const rules: CategoryRuleTable = [
  { id: "r1", categoryId: "cat-groceries", keyword: "checkers" },
  { id: "r2", categoryId: "cat-groceries", keyword: "woolworths" },
  { id: "r3", categoryId: "cat-transport", keyword: "uber" },
  { id: "r4", categoryId: "cat-coffee", keyword: "coffee" },
  { id: "r5", categoryId: "cat-coffee-shop", keyword: "coffee shop" },
];

describe("categorizeTransaction", () => {
  // UT-01
  it("assigns the category whose keyword matches the description", () => {
    expect(categorizeTransaction("CHECKERS HYPER SANDTON", rules)).toBe("cat-groceries");
  });

  it("matches case-insensitively", () => {
    expect(categorizeTransaction("Uber Trip 4821", rules)).toBe("cat-transport");
  });

  // UT-02
  it("returns null (never a default category) when nothing matches", () => {
    expect(categorizeTransaction("RANDOM UNMATCHED VENDOR 991", rules)).toBeNull();
  });

  // UT-03
  it("resolves overlapping matches to the longer, more specific keyword", () => {
    expect(categorizeTransaction("VIDA E CAFFE COFFEE SHOP", rules)).toBe("cat-coffee-shop");
  });

  it("still matches the shorter keyword when the longer one is absent", () => {
    expect(categorizeTransaction("SEATTLE COFFEE CO", rules)).toBe("cat-coffee");
  });

  it("ignores blank keywords rather than matching everything", () => {
    const rulesWithBlank: CategoryRuleTable = [
      { id: "r6", categoryId: "cat-blank", keyword: "   " },
      ...rules,
    ];
    expect(categorizeTransaction("UBER TRIP", rulesWithBlank)).toBe("cat-transport");
  });
});
