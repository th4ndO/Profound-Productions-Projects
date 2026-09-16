import { InvalidGoalError } from "./errors";
import type { SavingsGoal } from "./types";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * How much must be saved per week, from `asOf` onward, to hit the goal by
 * its targetDate.
 *
 * (target - currentSaved) / weeksRemaining, floored at 0 — a goal that is
 * already met needs no further pace, and this must never come back
 * negative. If the goal is unmet and its targetDate has already passed,
 * there is no valid pace to compute (dividing by zero or negative weeks),
 * so this throws InvalidGoalError rather than returning a nonsense number.
 */
export function requiredPaceCentsPerWeek(
  goal: SavingsGoal,
  currentSavedCents: number,
  asOf: Date,
): number {
  if (goal.targetCents <= 0) {
    throw new InvalidGoalError(`Goal "${goal.name}" has a non-positive target amount`);
  }

  const remainingCents = goal.targetCents - currentSavedCents;
  if (remainingCents <= 0) {
    return 0;
  }

  const msRemaining = goal.targetDate.getTime() - asOf.getTime();
  if (msRemaining <= 0) {
    throw new InvalidGoalError(
      `Goal "${goal.name}" targetDate has passed while still unmet — cannot compute a required pace`,
    );
  }

  const weeksRemaining = msRemaining / MS_PER_WEEK;
  return remainingCents / weeksRemaining;
}

/**
 * Whether a goal's current savings are at or ahead of the amount expected
 * by now, assuming even linear progress from the goal's creation date to
 * its target date. A goal that has already reached its target is always
 * on pace, regardless of the date.
 */
export function isOnPace(goal: SavingsGoal, currentSavedCents: number, asOf: Date): boolean {
  if (currentSavedCents >= goal.targetCents) return true;

  const totalMs = goal.targetDate.getTime() - goal.createdAt.getTime();
  if (totalMs <= 0) {
    // No real timeline to pace against (e.g. malformed dates); the goal
    // being met is the only thing "on pace" can mean here.
    return currentSavedCents >= goal.targetCents;
  }

  const elapsedMs = asOf.getTime() - goal.createdAt.getTime();
  const progressFraction = Math.min(Math.max(elapsedMs / totalMs, 0), 1);
  const expectedSavedCents = progressFraction * goal.targetCents;

  return currentSavedCents >= expectedSavedCents;
}
