import { describe, expect, it } from "vitest";
import { CATEGORIES, IDEAS, isCategory } from "./ideas";
import { TIMEFRAMES } from "./timeframe";
import { THEMES } from "../components/visuals/GoalVisual";

describe("IDEAS", () => {
  it("has unique ids (goals.idea_id relies on them)", () => {
    const ids = IDEAS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only known categories, time frames and themes", () => {
    for (const idea of IDEAS) {
      expect(isCategory(idea.cat), idea.id).toBe(true);
      expect(TIMEFRAMES, idea.id).toContain(idea.tf);
      expect(THEMES, idea.id).toContain(idea.theme);
    }
  });

  it("gives every idea at least two milestones", () => {
    for (const idea of IDEAS) expect(idea.ms.length, idea.id).toBeGreaterThanOrEqual(2);
  });

  it("has at least two ideas in every category, so no filter is empty", () => {
    for (const c of CATEGORIES) {
      expect(IDEAS.filter((i) => i.cat === c.id).length, c.id).toBeGreaterThanOrEqual(2);
    }
  });
});
