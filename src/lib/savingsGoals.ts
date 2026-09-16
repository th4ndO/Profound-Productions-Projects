import { isOnPace, requiredPaceCentsPerWeek } from "@/budgeting";
import type { SavingsGoal as CoreSavingsGoal } from "@/budgeting";
import { prisma } from "./prisma";

export async function createSavingsGoal(
  userId: string,
  name: string,
  targetCents: number,
  targetDate: Date,
) {
  if (targetCents <= 0) throw new Error("Target amount must be positive");
  return prisma.savingsGoal.create({
    data: { userId, name: name.trim(), targetCents, targetDate },
  });
}

/**
 * Appends a contribution. Contributions are append-only: this never
 * updates or deletes an existing SavingsContribution row (see BUILD SPEC
 * §11) — the running total is always derived by summing this log.
 */
export async function addContribution(goalId: string, amountCents: number, contributedAt?: Date) {
  if (amountCents <= 0) throw new Error("Contribution amount must be positive");
  return prisma.savingsContribution.create({
    data: { goalId, amountCents, ...(contributedAt ? { contributedAt } : {}) },
  });
}

export interface SavingsGoalStatus {
  goal: {
    id: string;
    name: string;
    targetCents: number;
    targetDate: Date;
    createdAt: Date;
  };
  currentSavedCents: number;
  requiredPaceCentsPerWeek: number;
  onPace: boolean;
}

/**
 * Sums the append-only contribution log and derives pace/on-pace status
 * live, as of now.
 *
 * Per BUILD SPEC §11, a BudgetingError is never caught here and papered
 * over with a substitute value — if the goal's targetDate has passed while
 * still unmet, requiredPaceCentsPerWeek() throws InvalidGoalError and it
 * is left to propagate to the caller, which decides how to present that
 * (e.g. "this goal is overdue" rather than a fabricated pace number).
 */
export async function getSavingsGoalStatus(goalId: string, asOf: Date = new Date()): Promise<SavingsGoalStatus> {
  const goal = await prisma.savingsGoal.findUniqueOrThrow({
    where: { id: goalId },
    include: { contributions: true },
  });

  const currentSavedCents = goal.contributions.reduce((sum, c) => sum + c.amountCents, 0);

  const coreGoal: CoreSavingsGoal = {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    targetCents: goal.targetCents,
    targetDate: goal.targetDate,
    createdAt: goal.createdAt,
  };

  return {
    goal,
    currentSavedCents,
    requiredPaceCentsPerWeek: requiredPaceCentsPerWeek(coreGoal, currentSavedCents, asOf),
    onPace: isOnPace(coreGoal, currentSavedCents, asOf),
  };
}

export async function getUserSavingsGoals(userId: string) {
  return prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { targetDate: "asc" },
  });
}
