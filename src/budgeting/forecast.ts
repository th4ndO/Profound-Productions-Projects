import { assertPositiveAmountCents } from "./errors";
import type { Transaction } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Trailing-window average daily spend, in cents.
 *
 * Sums the amountCents of every transaction that occurred within
 * [asOf - windowDays, asOf] (inclusive) and divides by windowDays.
 *
 * An empty window (no transactions fall inside it) returns 0 — that is a
 * legitimate value, not an error: a student genuinely spending nothing in
 * the window is real, unlike e.g. an ingredient cost of zero which would
 * never be legitimate. See INV-2: this is the stated method behind every
 * forecast, so it must be shown to the user, not just its output number.
 */
export function burnRateCentsPerDay(
  transactions: Transaction[],
  windowDays: number,
  asOf: Date,
): number {
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    throw new RangeError(`windowDays must be a positive number, got ${windowDays}`);
  }

  const windowStartMs = asOf.getTime() - windowDays * MS_PER_DAY;

  let totalCents = 0;
  for (const transaction of transactions) {
    assertPositiveAmountCents(transaction.amountCents, "transaction.amountCents");

    const occurredMs = transaction.occurredAt.getTime();
    if (occurredMs >= windowStartMs && occurredMs <= asOf.getTime()) {
      totalCents += transaction.amountCents;
    }
  }

  return totalCents / windowDays;
}

/**
 * How many whole days until the current balance is exhausted at the given
 * burn rate. Returns null — never a divide-by-zero — when burnRate is zero
 * or negative, since "never" isn't a day count.
 *
 * Per INV-2, any UI showing this number must also show the burn rate and
 * window it was derived from, recomputed live, never cached.
 */
export function daysUntilExhausted(
  currentBalanceCents: number,
  burnRateCentsPerDay: number,
): number | null {
  if (burnRateCentsPerDay <= 0) return null;
  return Math.floor(currentBalanceCents / burnRateCentsPerDay);
}
