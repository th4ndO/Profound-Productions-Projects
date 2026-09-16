import {
  assertValidPeriodDates,
  burnRateCentsPerDay,
  closePeriod,
  daysUntilExhausted,
} from "@/budgeting";
import type { BudgetPeriod as CoreBudgetPeriod, IncomeEvent, Transaction } from "@/budgeting";
import { prisma } from "./prisma";

/** The trailing window, in days, used for every burn-rate forecast. Shown in the UI per INV-2. */
export const FORECAST_WINDOW_DAYS = 14;

export async function createPeriod(
  userId: string,
  name: string,
  startDate: Date,
  endDate: Date,
) {
  assertValidPeriodDates(startDate, endDate);
  return prisma.budgetPeriod.create({
    data: { userId, name: name.trim(), startDate, endDate },
  });
}

async function loadPeriodTransactionsAndIncome(periodId: string) {
  const [transactions, income] = await Promise.all([
    prisma.transaction.findMany({ where: { periodId } }),
    prisma.incomeEvent.findMany({ where: { periodId } }),
  ]);
  return { transactions: transactions as Transaction[], income: income as IncomeEvent[] };
}

export interface PeriodDashboard {
  period: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    closed: boolean;
    closedAt: Date | null;
  };
  incomeCents: number;
  spendCents: number;
  balanceCents: number;
  uncategorizedSpendCents: number;
  /** Present only for a live (open) period — INV-2 wants the method visible, never just the number. */
  forecast: {
    windowDays: number;
    asOf: Date;
    burnRateCentsPerDay: number;
    daysUntilExhausted: number | null;
  } | null;
}

/**
 * Builds the numbers to show for a period. For a closed period this returns
 * the frozen figures verbatim (INV-3) — it never recomputes them from live
 * transaction data. For an open period every figure, including the
 * forecast, is computed fresh from current data (INV-2).
 */
export async function getPeriodDashboard(periodId: string): Promise<PeriodDashboard> {
  const period = await prisma.budgetPeriod.findUniqueOrThrow({ where: { id: periodId } });

  if (period.closed) {
    const incomeCents = period.frozenIncomeCents ?? 0;
    const spendCents = period.frozenSpendCents ?? 0;
    // Uncategorized spend is not itself frozen on the model (only the
    // three totals in §5 are), so it is derived from the same transactions
    // that existed at close time; recategorizing after close does not
    // change frozenSpendCents, only how that same total's breakdown reads.
    const { transactions } = await loadPeriodTransactionsAndIncome(periodId);
    const uncategorizedSpendCents = transactions
      .filter((t) => t.categoryId === null)
      .reduce((sum, t) => sum + t.amountCents, 0);

    return {
      period,
      incomeCents,
      spendCents,
      balanceCents: period.frozenEndBalanceCents ?? incomeCents - spendCents,
      uncategorizedSpendCents,
      forecast: null,
    };
  }

  const { transactions, income } = await loadPeriodTransactionsAndIncome(periodId);
  const incomeCents = income.reduce((sum, i) => sum + i.amountCents, 0);
  const spendCents = transactions.reduce((sum, t) => sum + t.amountCents, 0);
  const uncategorizedSpendCents = transactions
    .filter((t) => t.categoryId === null)
    .reduce((sum, t) => sum + t.amountCents, 0);
  const balanceCents = incomeCents - spendCents;

  const asOf = new Date();
  const rate = burnRateCentsPerDay(transactions, FORECAST_WINDOW_DAYS, asOf);

  return {
    period,
    incomeCents,
    spendCents,
    balanceCents,
    uncategorizedSpendCents,
    forecast: {
      windowDays: FORECAST_WINDOW_DAYS,
      asOf,
      burnRateCentsPerDay: rate,
      daysUntilExhausted: daysUntilExhausted(balanceCents, rate),
    },
  };
}

/**
 * Closes a period: computes frozen totals via the budgeting module and
 * persists them onto the row, along with closed=true/closedAt. Throws if
 * the period is already closed (via closePeriod()).
 */
export async function closePeriodById(periodId: string) {
  const periodRow = await prisma.budgetPeriod.findUniqueOrThrow({ where: { id: periodId } });
  const { transactions, income } = await loadPeriodTransactionsAndIncome(periodId);

  const corePeriod: CoreBudgetPeriod = {
    id: periodRow.id,
    userId: periodRow.userId,
    name: periodRow.name,
    startDate: periodRow.startDate,
    endDate: periodRow.endDate,
    closed: periodRow.closed,
    closedAt: periodRow.closedAt,
    frozenIncomeCents: periodRow.frozenIncomeCents,
    frozenSpendCents: periodRow.frozenSpendCents,
    frozenEndBalanceCents: periodRow.frozenEndBalanceCents,
  };

  const totals = closePeriod(corePeriod, transactions, income);

  return prisma.budgetPeriod.update({
    where: { id: periodId },
    data: {
      closed: true,
      closedAt: totals.closedAt,
      frozenIncomeCents: totals.frozenIncomeCents,
      frozenSpendCents: totals.frozenSpendCents,
      frozenEndBalanceCents: totals.frozenEndBalanceCents,
    },
  });
}

export async function getUserPeriods(userId: string) {
  return prisma.budgetPeriod.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
  });
}
