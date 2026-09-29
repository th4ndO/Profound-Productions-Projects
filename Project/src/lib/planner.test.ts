import { describe, expect, it } from "vitest";
import {
  addDays,
  cushionFor,
  formatDuration,
  formatTime,
  isValidDay,
  nowIn,
  parseTime,
  planDay,
  type PlannerTask,
} from "./planner";

let seq = 0;
function task(overrides: Partial<PlannerTask> = {}): PlannerTask {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Task ${seq}`,
    minutes: 30,
    fixedStart: null,
    kind: "must",
    done: false,
    position: seq,
    ...overrides,
  };
}

const DAY = { dayStart: parseTime("07:00"), dayEnd: parseTime("22:00") };
const starts = (plan: ReturnType<typeof planDay>) =>
  plan.blocks.map((b) => `${b.type === "break" ? "break" : b.task.title}@${formatTime(b.start)}-${formatTime(b.end)}`);

describe("cushionFor", () => {
  it("adds 20% rounded up to 5 minutes for tasks of 15+ minutes", () => {
    expect(cushionFor({ kind: "must", minutes: 60 })).toBe(15);
    expect(cushionFor({ kind: "nice", minutes: 30 })).toBe(10);
    expect(cushionFor({ kind: "must", minutes: 15 })).toBe(5);
  });
  it("adds none to short tasks and goal time boxes", () => {
    expect(cushionFor({ kind: "must", minutes: 10 })).toBe(0);
    expect(cushionFor({ kind: "goal", minutes: 60 })).toBe(0);
  });
});

describe("planDay", () => {
  it("places must-dos first, then goals, then nice-to-haves, from the start of the day", () => {
    const plan = planDay({
      ...DAY,
      tasks: [
        task({ title: "Nice", kind: "nice", minutes: 10 }),
        task({ title: "Goal", kind: "goal", minutes: 30 }),
        task({ title: "Must", kind: "must", minutes: 10 }),
      ],
    });
    expect(starts(plan)).toEqual(["Must@07:00-07:10", "Goal@07:10-07:40", "Nice@07:40-07:50"]);
    expect(plan.overflow).toEqual([]);
  });

  it("keeps fixed appointments where they are and fills around them", () => {
    const plan = planDay({
      ...DAY,
      tasks: [
        task({ title: "Dentist", fixedStart: parseTime("07:30"), minutes: 60 }),
        task({ title: "Big", minutes: 40 }), // 40 + 10 cushion = 50: too big for 07:00-07:30
        task({ title: "Small", minutes: 10 }),
      ],
    });
    expect(starts(plan)).toEqual(["Small@07:00-07:10", "Dentist@07:30-08:30", "Big@08:30-09:20"]);
  });

  it("adds a 10-minute break after about 90 minutes of work", () => {
    const plan = planDay({
      ...DAY,
      tasks: [task({ title: "A", kind: "goal", minutes: 60 }), task({ title: "B", kind: "goal", minutes: 60 })],
    });
    expect(starts(plan)).toEqual(["A@07:00-08:00", "break@08:00-08:10", "B@08:10-09:10"]);
  });

  it("does not add a break straight after a fixed appointment", () => {
    const plan = planDay({
      ...DAY,
      tasks: [
        task({ title: "Meeting", fixedStart: parseTime("07:00"), minutes: 120 }),
        task({ title: "A", kind: "goal", minutes: 60 }),
      ],
    });
    expect(starts(plan)).toEqual(["Meeting@07:00-09:00", "A@09:00-10:00"]);
  });

  it("starts from `from` (now) when planning today, rounded up to 5 minutes", () => {
    const plan = planDay({ ...DAY, from: parseTime("13:02"), tasks: [task({ title: "A", minutes: 10 })] });
    expect(starts(plan)).toEqual(["A@13:05-13:15"]);
    expect(plan.availableMinutes).toBe(parseTime("22:00") - parseTime("13:05"));
  });

  it("reports what doesn't fit instead of squeezing it in", () => {
    const plan = planDay({
      dayStart: parseTime("09:00"),
      dayEnd: parseTime("10:00"),
      tasks: [
        task({ title: "Fits", kind: "goal", minutes: 45 }),
        task({ title: "Too much", kind: "nice", minutes: 30 }),
      ],
    });
    expect(starts(plan)).toEqual(["Fits@09:00-09:45"]);
    expect(plan.overflow.map((t) => t.title)).toEqual(["Too much"]);
    expect(plan.usedMinutes).toBe(45);
    expect(plan.availableMinutes).toBe(60);
  });

  it("skips done tasks", () => {
    const plan = planDay({ ...DAY, tasks: [task({ title: "Done", done: true }), task({ title: "Open", minutes: 10 })] });
    expect(starts(plan)).toEqual(["Open@07:00-07:10"]);
  });

  it("flags overlapping appointments as a conflict but keeps both", () => {
    const plan = planDay({
      ...DAY,
      tasks: [
        task({ title: "One", fixedStart: parseTime("10:00"), minutes: 60 }),
        task({ title: "Two", fixedStart: parseTime("10:30"), minutes: 30 }),
      ],
    });
    const conflicts = plan.blocks.filter((b) => b.type === "task" && b.conflict).map((b) => b.type === "task" && b.task.title);
    expect(conflicts).toEqual(["Two"]);
  });

  it("fills an earlier gap with a later, smaller task", () => {
    const plan = planDay({
      ...DAY,
      tasks: [
        task({ title: "Call", fixedStart: parseTime("07:20"), minutes: 10 }),
        task({ title: "Long", minutes: 60 }),
        task({ title: "Quick", kind: "nice", minutes: 10 }),
      ],
    });
    expect(starts(plan)).toEqual(["Quick@07:00-07:10", "Call@07:20-07:30", "Long@07:30-08:45"]);
  });

  it("has nothing to plan when now is after the end of the day", () => {
    const plan = planDay({ ...DAY, from: parseTime("23:00"), tasks: [task({ title: "Late", minutes: 10 })] });
    expect(plan.availableMinutes).toBe(0);
    expect(plan.overflow.map((t) => t.title)).toEqual(["Late"]);
  });
});

describe("time helpers", () => {
  it("parses and formats times", () => {
    expect(parseTime("07:30")).toBe(450);
    expect(parseTime("21:05:00")).toBe(1265);
    expect(formatTime(450)).toBe("07:30");
    expect(formatTime(1440 + 15)).toBe("00:15");
  });

  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(95)).toBe("1h 35m");
  });

  it("gets today and the minute of day in a timezone", () => {
    // 2026-09-29 22:30 UTC = 2026-09-30 00:30 in Johannesburg (UTC+2).
    expect(nowIn("Africa/Johannesburg", new Date("2026-09-29T22:30:00Z"))).toEqual({ day: "2026-09-30", minutes: 30 });
  });

  it("adds days across month ends and validates dates", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(isValidDay("2026-09-30")).toBe(true);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("30-09-2026")).toBe(false);
  });
});
