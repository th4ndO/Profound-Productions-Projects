import { describe, expect, it } from "vitest";
import { gProg, mProg, pct, type Goal, type Milestone } from "./progress";

describe("mProg", () => {
  it("returns 1 for a milestone marked done, regardless of its tasks", () => {
    const m: Milestone = {
      done: true,
      tasks: [{ done: false }, { done: false }, { done: false }],
    };
    expect(mProg(m)).toBe(1);
  });

  it("returns 1 for a milestone marked done with no tasks at all", () => {
    const m: Milestone = { done: true, tasks: [] };
    expect(mProg(m)).toBe(1);
  });

  it("returns 0 for a milestone with no tasks and not done", () => {
    const m: Milestone = { done: false, tasks: [] };
    expect(mProg(m)).toBe(0);
  });

  it("returns done/total for a milestone with some tasks done", () => {
    const m: Milestone = {
      done: false,
      tasks: [{ done: true }, { done: true }, { done: false }, { done: false }],
    };
    expect(mProg(m)).toBe(0.5);
  });

  it("returns 1 for a milestone (not marked done) whose tasks are all done", () => {
    const m: Milestone = {
      done: false,
      tasks: [{ done: true }, { done: true }],
    };
    expect(mProg(m)).toBe(1);
  });

  it("returns 0 for a milestone with tasks but none done", () => {
    const m: Milestone = {
      done: false,
      tasks: [{ done: false }, { done: false }],
    };
    expect(mProg(m)).toBe(0);
  });
});

describe("gProg", () => {
  it("returns 0 for a goal with no milestones", () => {
    const g: Goal = { milestones: [] };
    expect(gProg(g)).toBe(0);
  });

  it("averages milestone progress unweighted by task count", () => {
    // One milestone fully done via a single task, another with 1/2 tasks
    // done spread across very different task counts. An unweighted
    // average treats each milestone equally regardless of task count.
    const g: Goal = {
      milestones: [
        { done: false, tasks: [{ done: true }] }, // mProg = 1
        {
          done: false,
          tasks: [{ done: true }, { done: false }, { done: false }, { done: false }],
        }, // mProg = 0.25
      ],
    };
    // (1 + 0.25) / 2 = 0.625 — not weighted by the 1 vs 4 task counts.
    expect(gProg(g)).toBeCloseTo(0.625);
  });

  it("is the simple mean of each milestone's mProg", () => {
    const milestones: Milestone[] = [
      { done: true, tasks: [] },
      { done: false, tasks: [{ done: true }, { done: false }] },
      { done: false, tasks: [] },
    ];
    const g: Goal = { milestones };
    const expected =
      milestones.reduce((a, m) => a + mProg(m), 0) / milestones.length;
    expect(gProg(g)).toBeCloseTo(expected);
    expect(gProg(g)).toBeCloseTo((1 + 0.5 + 0) / 3);
  });

  it("returns 1 when every milestone is complete", () => {
    const g: Goal = {
      milestones: [
        { done: true, tasks: [] },
        { done: false, tasks: [{ done: true }, { done: true }] },
      ],
    };
    expect(gProg(g)).toBe(1);
  });
});

describe("pct", () => {
  it("rounds a 0..1 fraction to a whole-number percentage", () => {
    expect(pct(0)).toBe(0);
    expect(pct(1)).toBe(100);
    expect(pct(0.5)).toBe(50);
    expect(pct(0.625)).toBe(63); // Math.round rounds half away from zero here
    expect(pct(0.624)).toBe(62);
  });
});
