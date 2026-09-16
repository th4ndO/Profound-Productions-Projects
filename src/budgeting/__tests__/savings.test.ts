import { describe, expect, it } from "vitest";
import { InvalidGoalError } from "../errors";
import { isOnPace, requiredPaceCentsPerWeek } from "../savings";
import type { SavingsGoal } from "../types";

function goal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "g1",
    userId: "u1",
    name: "Laptop fund",
    targetCents: 400_000, // R4000
    targetDate: new Date("2026-05-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("requiredPaceCentsPerWeek", () => {
  // UT-10
  it("returns the flat weekly amount needed for a goal exactly on track", () => {
    const g = goal({
      createdAt: new Date("2026-01-01T00:00:00Z"),
      targetDate: new Date("2026-01-29T00:00:00Z"), // exactly 4 weeks later
      targetCents: 400_000,
    });
    const asOf = new Date("2026-01-01T00:00:00Z");

    // R4000 over 4 weeks = R1000/week = 100_000 cents/week
    expect(requiredPaceCentsPerWeek(g, 0, asOf)).toBe(100_000);
  });

  // UT-11
  it("returns 0, never negative, for a goal already met", () => {
    const g = goal({ targetCents: 400_000 });
    const asOf = new Date("2026-02-01T00:00:00Z");
    expect(requiredPaceCentsPerWeek(g, 450_000, asOf)).toBe(0);
    expect(requiredPaceCentsPerWeek(g, 400_000, asOf)).toBe(0);
  });

  // UT-12
  it("throws InvalidGoalError when the target date has passed while unmet", () => {
    const g = goal({
      targetDate: new Date("2026-01-01T00:00:00Z"),
      targetCents: 400_000,
    });
    const asOf = new Date("2026-02-01T00:00:00Z"); // after targetDate
    expect(() => requiredPaceCentsPerWeek(g, 100_000, asOf)).toThrow(InvalidGoalError);
  });

  it("throws InvalidGoalError for a non-positive target amount", () => {
    const g = goal({ targetCents: 0 });
    expect(() => requiredPaceCentsPerWeek(g, 0, new Date("2026-01-01T00:00:00Z"))).toThrow(
      InvalidGoalError,
    );
  });
});

describe("isOnPace", () => {
  const base = goal({
    createdAt: new Date("2026-01-01T00:00:00Z"),
    targetDate: new Date("2026-02-26T00:00:00Z"), // 8 weeks later
    targetCents: 400_000,
  });

  // UT-13
  it("flags a goal that is behind its required contribution pace", () => {
    const halfway = new Date("2026-01-29T00:00:00Z"); // 4 of 8 weeks elapsed
    // Expected by now: R2000. Only R1000 saved => behind.
    expect(isOnPace(base, 100_000, halfway)).toBe(false);
  });

  it("flags a goal that is at or ahead of its required pace as on pace", () => {
    const halfway = new Date("2026-01-29T00:00:00Z");
    expect(isOnPace(base, 200_000, halfway)).toBe(true);
    expect(isOnPace(base, 250_000, halfway)).toBe(true);
  });

  it("treats an already-met goal as on pace regardless of date", () => {
    expect(isOnPace(base, 400_000, new Date("2026-01-02T00:00:00Z"))).toBe(true);
  });
});
