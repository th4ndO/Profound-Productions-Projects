// Pure data shapes used by the budgeting module.
//
// These intentionally mirror the shape of the Prisma models (see
// prisma/schema.prisma) but are declared independently — this file has no
// import from "@prisma/client". That keeps src/budgeting/ portable: it can
// be unit-tested, or reused in a different persistence layer, without ever
// touching a database or a framework.

/** A single category-matching rule: a case-insensitive substring keyword. */
export interface CategoryRule {
  id: string;
  categoryId: string;
  keyword: string;
}

/** A category together with the rules used to auto-match transactions to it. */
export interface Category {
  id: string;
  name: string;
  isSystem: boolean;
}

/**
 * The lookup table passed to categorizeTransaction(): every rule across
 * every category for a user, each carrying its own categoryId so the
 * matcher can report which category a keyword belongs to.
 */
export type CategoryRuleTable = CategoryRule[];

export interface Transaction {
  id: string;
  userId: string;
  /** Always positive integer cents. This model is spend-only. */
  amountCents: number;
  description: string;
  occurredAt: Date;
  categoryId: string | null;
  source: "MANUAL" | "CSV_IMPORT";
  periodId: string | null;
}

export interface IncomeEvent {
  id: string;
  userId: string;
  amountCents: number;
  source: string;
  receivedAt: Date;
  periodId: string | null;
}

export interface BudgetPeriod {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  closed: boolean;
  closedAt: Date | null;
  frozenIncomeCents: number | null;
  frozenSpendCents: number | null;
  frozenEndBalanceCents: number | null;
}

/**
 * The result of closePeriod(): the frozen totals a caller must persist
 * verbatim onto the BudgetPeriod row (see INV-3 in the build spec).
 */
export interface ClosedPeriodTotals {
  closedAt: Date;
  frozenIncomeCents: number;
  frozenSpendCents: number;
  frozenEndBalanceCents: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetCents: number;
  targetDate: Date;
  createdAt: Date;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amountCents: number;
  contributedAt: Date;
}
