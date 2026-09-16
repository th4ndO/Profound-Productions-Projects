// Domain errors for the budgeting module.
//
// These are thrown, never swallowed. Per BUILD SPEC §11: "Do not catch a
// BudgetingError and substitute a default value — let it surface." Callers
// (server actions, API routes, UI) are expected to catch these only to show
// the user a message, never to silently continue with a fallback number.

export class BudgetingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an amount that must be positive is negative or zero. */
export class InvalidAmountError extends BudgetingError {}

/**
 * Thrown when a period's endDate <= startDate, or when an operation is
 * attempted on a period that is already closed.
 */
export class InvalidPeriodError extends BudgetingError {}

/**
 * Thrown when a savings goal's targetDate is in the past (with the goal
 * still unmet), or its target amount is <= 0.
 */
export class InvalidGoalError extends BudgetingError {}

/**
 * Shared guard used anywhere the module sums or persists a monetary amount
 * that the data model declares must be positive (e.g. Transaction.amountCents,
 * IncomeEvent.amountCents, SavingsContribution.amountCents). Throws
 * InvalidAmountError rather than silently coercing or skipping the value —
 * per INV-1, spend must never be silently dropped.
 */
export function assertPositiveAmountCents(amountCents: number, label = "amount"): void {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new InvalidAmountError(
      `${label} must be a positive number of cents, got ${amountCents}`,
    );
  }
}
