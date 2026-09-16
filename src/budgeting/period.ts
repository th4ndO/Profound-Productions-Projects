import { assertPositiveAmountCents, InvalidPeriodError } from "./errors";
import type { BudgetPeriod, ClosedPeriodTotals, IncomeEvent, Transaction } from "./types";

/** True if `date` falls within [period.startDate, period.endDate], inclusive. */
export function isWithinPeriod(date: Date, period: BudgetPeriod): boolean {
  return date.getTime() >= period.startDate.getTime() && date.getTime() <= period.endDate.getTime();
}

/**
 * Validates that a period's date range is sane. Intended to be called by
 * the app layer when a BudgetPeriod is created or edited (this module has
 * no persistence, so it cannot enforce this on save itself).
 */
export function assertValidPeriodDates(startDate: Date, endDate: Date): void {
  if (endDate.getTime() <= startDate.getTime()) {
    throw new InvalidPeriodError("A period's endDate must be after its startDate");
  }
}

/**
 * Closes a budget period, computing the totals that must be frozen onto it
 * forever (INV-3). Only transactions/income that fall within the period's
 * date range are counted — per INV-1, every one of them is counted in
 * frozenSpendCents, categorized or not.
 *
 * Throws InvalidPeriodError if the period is already closed — closing is a
 * one-way operation, never silently re-run.
 *
 * The caller is responsible for persisting the returned totals verbatim
 * onto the BudgetPeriod row and for never recomputing/overwriting them
 * afterward, no matter what later changes to transactions or categories.
 */
export function closePeriod(
  period: BudgetPeriod,
  transactions: Transaction[],
  income: IncomeEvent[],
): ClosedPeriodTotals {
  if (period.closed) {
    throw new InvalidPeriodError(`Period "${period.name}" is already closed`);
  }

  let frozenSpendCents = 0;
  for (const transaction of transactions) {
    if (!isWithinPeriod(transaction.occurredAt, period)) continue;
    assertPositiveAmountCents(transaction.amountCents, "transaction.amountCents");
    frozenSpendCents += transaction.amountCents;
  }

  let frozenIncomeCents = 0;
  for (const incomeEvent of income) {
    if (!isWithinPeriod(incomeEvent.receivedAt, period)) continue;
    assertPositiveAmountCents(incomeEvent.amountCents, "incomeEvent.amountCents");
    frozenIncomeCents += incomeEvent.amountCents;
  }

  return {
    closedAt: new Date(),
    frozenIncomeCents,
    frozenSpendCents,
    frozenEndBalanceCents: frozenIncomeCents - frozenSpendCents,
  };
}
