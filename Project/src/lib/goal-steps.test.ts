import { describe, expect, it } from "vitest";
import { completedAtFor, nextStep, type StepMilestone } from "./goal-steps";

function ms(position: number, done: boolean, tasks: [string, boolean][] = []): StepMilestone {
  return {
    id: `m${position}`,
    title: `Milestone ${position}`,
    done,
    position,
    tasks: tasks.map(([title, d], i) => ({ id: `m${position}t${i}`, title, done: d, position: i })),
  };
}

describe("nextStep", () => {
  it("picks the first unfinished task in the first unfinished milestone", () => {
    const step = nextStep([
      ms(1, false, [["Week 2", false], ["Week 1", true]]),
      ms(0, false, [["Pick days", true], ["Week 1 run", false], ["Week 2 run", false]]),
    ]);
    expect(step).toEqual({ kind: "task", id: "m0t1", title: "Week 1 run" });
  });

  it("skips milestones that are done, by flag or by tasks", () => {
    const step = nextStep([
      ms(0, true, [["a", false]]),
      ms(1, false, [["b", true]]),
      ms(2, false, [["c", false]]),
    ]);
    expect(step?.id).toBe("m2t0");
  });

  it("returns the milestone itself when it has no tasks", () => {
    expect(nextStep([ms(0, false)])).toEqual({ kind: "milestone", id: "m0", title: "Milestone 0" });
  });

  it("returns null when everything is done", () => {
    expect(nextStep([ms(0, true), ms(1, false, [["x", true]])])).toBeNull();
    expect(nextStep([])).toBeNull();
  });
});

describe("completedAtFor", () => {
  const now = new Date("2026-10-06T10:00:00Z");
  it("sets the date when every milestone is done, keeping an earlier one", () => {
    expect(completedAtFor([{ done: true, tasks: [] }], null, now)).toBe(now.toISOString());
    expect(completedAtFor([{ done: false, tasks: [{ done: true }] }], "2026-10-01T00:00:00Z", now)).toBe(
      "2026-10-01T00:00:00Z",
    );
  });
  it("clears it when progress drops below 100%, and never completes an empty goal", () => {
    expect(completedAtFor([{ done: false, tasks: [{ done: false }] }], "2026-10-01T00:00:00Z", now)).toBeNull();
    expect(completedAtFor([], null, now)).toBeNull();
  });
});
