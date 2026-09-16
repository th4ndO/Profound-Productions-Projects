import { describe, expect, it } from "vitest";
import { InvalidPeriodError } from "../errors";
import { assertValidPeriodDates, closePeriod, isWithinPeriod } from "../period";
import type { BudgetPeriod, IncomeEvent, Transaction } from "../types";

function period(overrides: Partial<BudgetPeriod> = {}): BudgetPeriod {
  return {
    id: "p1",
    userId: "u1",
    name: "2026 Semester 1",
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: new Date("2026-01-31T00:00:00Z"),
    closed: false,
    closedAt: null,
    frozenIncomeCents: null,
    frozenSpendCents: null,
    frozenEndBalanceCents: null,
    ...overrides,
  };
}

function tx(id: string, amountCents: number, occurredAt: string): Transaction {
  return {
    id,
    userId: "u1",
    amountCents,
    description: `tx-${id}`,
    occurredAt: new Date(occurredAt),
    categoryId: null,
    source: "MANUAL",
    periodId: "p1",
  };
}

function income(id: string, amountCents: number, receivedAt: string): IncomeEvent {
  return {
    id,
    userId: "u1",
    amountCents,
    source: "Allowance",
    receivedAt: new Date(receivedAt),
    periodId: "p1",
  };
}

describe("isWithinPeriod", () => {
  it("is inclusive of both boundary dates", () => {
    const p = period();
    expect(isWithinPeriod(p.startDate, p)).toBe(true);
    expect(isWithinPeriod(p.endDate, p)).toBe(true);
    expect(isWithinPeriod(new Date("2025-12-31T00:00:00Z"), p)).toBe(false);
    expect(isWithinPeriod(new Date("2026-02-01T00:00:00Z"), p)).toBe(false);
  });
});

describe("assertValidPeriodDates", () => {
  it("throws InvalidPeriodError when endDate <= startDate", () => {
    const start = new Date("2026-01-31T00:00:00Z");
    const end = new Date("2026-01-01T00:00:00Z");
    expect(() => assertValidPeriodDates(start, end)).toThrow(InvalidPeriodError);
  });

  it("allows a valid date range", () => {
    expect(() =>
      assertValidPeriodDates(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-31T00:00:00Z")),
    ).not.toThrow();
  });
});

describe("closePeriod", () => {
  // UT-08
  it("computes totals that exactly match a hand-summed expectation", () => {
    const p = period();
    const transactions = [
      tx("t1", 15_000, "2026-01-05T00:00:00Z"),
      tx("t2", 22_500, "2026-01-10T00:00:00Z"),
      tx("t3", 5_000, "2025-12-31T00:00:00Z"), // outside period, excluded
    ];
    const incomeEvents = [
      income("i1", 500_000, "2026-01-01T00:00:00Z"),
      income("i2", 100_000, "2026-02-15T00:00:00Z"), // outside period, excluded
    ];

    const totals = closePeriod(p, transactions, incomeEvents);

    // Hand-summed: spend = 15000 + 22500 = 37500; income = 500000
    expect(totals.frozenSpendCents).toBe(37_500);
    expect(totals.frozenIncomeCents).toBe(500_000);
    expect(totals.frozenEndBalanceCents).toBe(500_000 - 37_500);
    expect(totals.closedAt).toBeInstanceOf(Date);
  });

  it("counts an uncategorized transaction toward spend totals (INV-1)", () => {
    const p = period();
    const uncategorized = tx("t1", 34_000, "2026-01-05T00:00:00Z");
    expect(uncategorized.categoryId).toBeNull();

    const totals = closePeriod(p, [uncategorized], []);

    expect(totals.frozenSpendCents).toBe(34_000);
  });

  // UT-09
  it("throws InvalidPeriodError when closing an already-closed period", () => {
    const closed = period({ closed: true, closedAt: new Date("2026-02-01T00:00:00Z") });
    expect(() => closePeriod(closed, [], [])).toThrow(InvalidPeriodError);
  });
});
