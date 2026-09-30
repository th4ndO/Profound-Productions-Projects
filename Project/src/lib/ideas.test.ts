import { describe, expect, it } from "vitest";
import { CATEGORIES, IDEAS, isCategory } from "./ideas";
import { PLANS, matchPlans } from "./plans";
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

  it("fits the goals/milestones length checks, so adopting never fails", () => {
    // See the initial_schema migration: goals.title <= 80, goals.reward <= 120,
    // milestones.title <= 100.
    for (const idea of IDEAS) {
      expect(idea.title.length, idea.id).toBeLessThanOrEqual(80);
      expect(idea.reward.length, idea.id).toBeLessThanOrEqual(120);
      for (const m of idea.ms) expect(m.length, `${idea.id}: ${m}`).toBeLessThanOrEqual(100);
    }
  });

  it("has at least two ideas in every category, so no filter is empty", () => {
    for (const c of CATEGORIES) {
      expect(IDEAS.filter((i) => i.cat === c.id).length, c.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("PLANS", () => {
  it("belongs to a real idea, and adopting it fits the database length checks", () => {
    for (const [id, plan] of Object.entries(PLANS)) {
      expect(IDEAS.some((i) => i.id === id), id).toBe(true);
      expect(plan.milestones.length, id).toBeGreaterThanOrEqual(3);
      for (const m of plan.milestones) {
        expect(m.title.length, `${id}: ${m.title}`).toBeLessThanOrEqual(100);
        expect(m.tasks.length, `${id}: ${m.title}`).toBeGreaterThanOrEqual(1);
        for (const t of m.tasks) expect(t.length, `${id}: ${t}`).toBeLessThanOrEqual(100);
      }
      expect(plan.tips.length, id).toBeGreaterThanOrEqual(2);
      expect(plan.resources.length, id).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows the plan's milestones on the idea card", () => {
    for (const id of Object.keys(PLANS)) {
      const idea = IDEAS.find((i) => i.id === id)!;
      expect(idea.ms).toEqual(PLANS[id].milestones.map((m) => m.title));
    }
  });

  it("never links to a page (resources are named, not linked, until URLs are checked)", () => {
    for (const plan of Object.values(PLANS)) {
      for (const r of plan.resources) expect(`${r.name} ${r.detail}`).not.toMatch(/https?:\/\//);
    }
  });
});

describe("matchPlans", () => {
  it("finds a plan from the way people phrase goals", () => {
    expect(matchPlans("I want to run 10km without stopping")).toContain("run-10k");
    expect(matchPlans("Run a 10 km race")).toContain("run-10k");
    expect(matchPlans("Finish a half marathon")).toContain("half");
    expect(matchPlans("do 5 pull-ups")).toContain("pullups");
    expect(matchPlans("save an emergency fund")).toContain("fund");
    expect(matchPlans("learn isiZulu")).toContain("lang");
    expect(matchPlans("Read the Bible in a year")).toContain("bible-in-a-year");
    expect(matchPlans("learn to swim")).toContain("swim");
    expect(matchPlans("improve my typing speed")).toContain("typing");
  });

  it("doesn't confuse similar numbers or match nothing-goals", () => {
    expect(matchPlans("run 15km")).not.toContain("parkrun");
    expect(matchPlans("save R100k")).not.toContain("run-10k");
    expect(matchPlans("save 10k this year")).not.toContain("run-10k");
    expect(matchPlans("earn 5k extra a month")).not.toContain("parkrun");
    expect(matchPlans("run a 10k")).toContain("run-10k");
    expect(matchPlans("my first 5k run")).toContain("parkrun");
    expect(matchPlans("ten k race")).toContain("run-10k");
    expect(matchPlans("five k fun run")).toContain("parkrun");
    expect(matchPlans("raise ten kids")).not.toContain("run-10k");
    expect(matchPlans("Write a novel")).toEqual([]);
    expect(matchPlans("ab")).toEqual([]);
  });
});
