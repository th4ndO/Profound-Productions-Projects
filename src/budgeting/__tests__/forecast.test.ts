import { describe, expect, it } from "vitest";
import { InvalidAmountError } from "../errors";
import { burnRateCentsPerDay, daysUntilExhausted } from "../forecast";
import type { Transaction } from "../types";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    userId: "u1",
    amountCents: 1000,
    description: "test",
    occurredAt: new Date("2026-01-10T00:00:00Z"),
    categoryId: null,
    source: "MANUAL",
    periodId: null,
    ...overrides,
  };
}

describe("burnRateCentsPerDay", () => {
  // UT-04
  it("computes R100/day over a 14-day window with R1400 spent", () => {
    const asOf = new Date("2026-01-14T00:00:00Z");
    const transactions: Transaction[] = [
      tx({ id: "1", amountCents: 70_000, occurredAt: new Date("2026-01-02T00:00:00Z") }),
      tx({ id: "2", amountCents: 70_000, occurredAt: new Date("2026-01-10T00:00:00Z") }),
    ];

    const result = burnRateCentsPerDay(transactions, 14, asOf);

    expect(result).toBe(10_000); // R100/day in cents
  });

  // UT-05
  it("returns 0, not an error, over a window with zero transactions", () => {
    const asOf = new Date("2026-01-14T00:00:00Z");
    expect(burnRateCentsPerDay([], 14, asOf)).toBe(0);
  });

  it("excludes transactions outside the trailing window", () => {
    const asOf = new Date("2026-01-14T00:00:00Z");
    const transactions: Transaction[] = [
      tx({ id: "1", amountCents: 100_000, occurredAt: new Date("2025-12-01T00:00:00Z") }),
    ];
    expect(burnRateCentsPerDay(transactions, 7, asOf)).toBe(0);
  });

  // UT-14
  it("throws InvalidAmountError for a zero or negative transaction amount", () => {
    const asOf = new Date("2026-01-14T00:00:00Z");
    const transactions: Transaction[] = [tx({ amountCents: 0 })];
    expect(() => burnRateCentsPerDay(transactions, 14, asOf)).toThrow(InvalidAmountError);

    const negative: Transaction[] = [tx({ amountCents: -500 })];
    expect(() => burnRateCentsPerDay(negative, 14, asOf)).toThrow(InvalidAmountError);
  });
});

describe("daysUntilExhausted", () => {
  // UT-06
  it("divides balance by burn rate, floored, for a positive burn rate", () => {
    expect(daysUntilExhausted(95_000, 10_000)).toBe(9); // 9.5 -> floored to 9
  });

  // UT-07
  it("returns null for a zero burn rate, never dividing by zero", () => {
    expect(daysUntilExhausted(50_000, 0)).toBeNull();
  });

  it("returns null for a negative burn rate", () => {
    expect(daysUntilExhausted(50_000, -100)).toBeNull();
  });
});
