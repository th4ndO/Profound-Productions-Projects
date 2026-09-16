import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCategory, addCategoryRule } from "@/lib/categories";
import { createTransaction, recategorizeTransaction, importCsvTransactions, parseTransactionsCsv } from "@/lib/transactions";
import { createPeriod, closePeriodById, getPeriodDashboard } from "@/lib/periods";
import { createSavingsGoal, addContribution, getSavingsGoalStatus } from "@/lib/savingsGoals";

async function createTestUser() {
  return prisma.user.create({
    data: { email: `${randomUUID()}@test.local`, passwordHash: "not-a-real-hash" },
  });
}

describe("integration: budgeting flows against a real database", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // IT-01
  it("does not change a closed period's frozen totals when a transaction is recategorized", async () => {
    const user = await createTestUser();
    const category = await createCategory(user.id, "Groceries");

    const period = await createPeriod(
      user.id,
      "IT-01 period",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-31T00:00:00Z"),
    );

    const tx = await createTransaction({
      userId: user.id,
      amountCents: 10_000,
      description: "UNMATCHED VENDOR",
      occurredAt: new Date("2026-01-10T00:00:00Z"),
      source: "MANUAL",
      periodId: period.id,
    });
    expect(tx.categoryId).toBeNull();

    await closePeriodById(period.id);
    const closedBefore = await prisma.budgetPeriod.findUniqueOrThrow({ where: { id: period.id } });
    expect(closedBefore.frozenSpendCents).toBe(10_000);

    await recategorizeTransaction(tx.id, category.id);

    const closedAfter = await prisma.budgetPeriod.findUniqueOrThrow({ where: { id: period.id } });
    expect(closedAfter.frozenSpendCents).toBe(closedBefore.frozenSpendCents);
    expect(closedAfter.frozenIncomeCents).toBe(closedBefore.frozenIncomeCents);
    expect(closedAfter.frozenEndBalanceCents).toBe(closedBefore.frozenEndBalanceCents);
  });

  // IT-02
  it("matches CSV-imported transactions to existing category rules", async () => {
    const user = await createTestUser();
    const groceries = await createCategory(user.id, "Groceries CSV");
    await addCategoryRule(groceries.id, "checkers");

    const csvText = [
      "date,description,amount",
      "2026-02-01,CHECKERS HYPER SANDTON,125.50",
      "2026-02-02,SOME UNMATCHED SHOP,40.00",
    ].join("\n");

    const rows = parseTransactionsCsv(csvText);
    expect(rows).toHaveLength(2);

    const created = await importCsvTransactions(user.id, rows, null);
    const matched = created.find((t) => t.description === "CHECKERS HYPER SANDTON");
    const unmatched = created.find((t) => t.description === "SOME UNMATCHED SHOP");

    expect(matched?.categoryId).toBe(groceries.id);
    expect(matched?.amountCents).toBe(12_550);
    expect(unmatched?.categoryId).toBeNull();
  });

  // IT-03 — "the most important test in the project"
  it("leaves a closed period's stored totals unaffected by a new backdated transaction", async () => {
    const user = await createTestUser();
    const period = await createPeriod(
      user.id,
      "IT-03 period",
      new Date("2026-03-01T00:00:00Z"),
      new Date("2026-03-31T00:00:00Z"),
    );

    await createTransaction({
      userId: user.id,
      amountCents: 20_000,
      description: "Original spend",
      occurredAt: new Date("2026-03-05T00:00:00Z"),
      source: "MANUAL",
      periodId: period.id,
    });

    await closePeriodById(period.id);
    const frozenBefore = await prisma.budgetPeriod.findUniqueOrThrow({ where: { id: period.id } });
    expect(frozenBefore.frozenSpendCents).toBe(20_000);

    // A backdated transaction, added AFTER the period was closed, falling
    // inside the closed period's own date range.
    await createTransaction({
      userId: user.id,
      amountCents: 99_999,
      description: "Backdated spend added after close",
      occurredAt: new Date("2026-03-15T00:00:00Z"),
      source: "MANUAL",
      periodId: period.id,
    });

    const frozenAfter = await prisma.budgetPeriod.findUniqueOrThrow({ where: { id: period.id } });
    expect(frozenAfter.frozenSpendCents).toBe(20_000);
    expect(frozenAfter.frozenSpendCents).toBe(frozenBefore.frozenSpendCents);
    expect(frozenAfter.frozenIncomeCents).toBe(frozenBefore.frozenIncomeCents);
    expect(frozenAfter.frozenEndBalanceCents).toBe(frozenBefore.frozenEndBalanceCents);

    // The dashboard for the closed period must also read the frozen
    // values, not a recomputed 119,999-cent total.
    const dashboard = await getPeriodDashboard(period.id);
    expect(dashboard.spendCents).toBe(20_000);
  });

  // IT-04
  it("changes the live dashboard's forecast immediately, while a closed period's figures do not", async () => {
    const user = await createTestUser();

    const openPeriod = await createPeriod(
      user.id,
      "IT-04 open period",
      new Date("2026-04-01T00:00:00Z"),
      new Date("2026-04-30T00:00:00Z"),
    );
    const closedPeriod = await createPeriod(
      user.id,
      "IT-04 closed period",
      new Date("2026-03-01T00:00:00Z"),
      new Date("2026-03-31T00:00:00Z"),
    );

    await createTransaction({
      userId: user.id,
      amountCents: 15_000,
      description: "Closed period spend",
      occurredAt: new Date("2026-03-10T00:00:00Z"),
      source: "MANUAL",
      periodId: closedPeriod.id,
    });
    await closePeriodById(closedPeriod.id);
    const closedBefore = await getPeriodDashboard(closedPeriod.id);

    const now = new Date();
    await createTransaction({
      userId: user.id,
      amountCents: 5_000,
      description: "Open period spend 1",
      occurredAt: now,
      source: "MANUAL",
      periodId: openPeriod.id,
    });
    const dashboardBefore = await getPeriodDashboard(openPeriod.id);
    const rateBefore = dashboardBefore.forecast?.burnRateCentsPerDay ?? 0;

    await createTransaction({
      userId: user.id,
      amountCents: 50_000,
      description: "Open period spend 2 (new)",
      occurredAt: now,
      source: "MANUAL",
      periodId: openPeriod.id,
    });
    const dashboardAfter = await getPeriodDashboard(openPeriod.id);
    const rateAfter = dashboardAfter.forecast?.burnRateCentsPerDay ?? 0;

    expect(rateAfter).toBeGreaterThan(rateBefore);

    const closedAfter = await getPeriodDashboard(closedPeriod.id);
    expect(closedAfter.spendCents).toBe(closedBefore.spendCents);
    expect(closedAfter.spendCents).toBe(15_000);
  });

  // IT-05
  it("updates a savings goal's on-pace status after logging a contribution", async () => {
    const user = await createTestUser();

    const goal = await createSavingsGoal(
      user.id,
      "IT-05 goal",
      400_000, // R4000
      new Date("2026-08-26T00:00:00Z"), // 8 weeks after createdAt below
    );
    await prisma.savingsGoal.update({
      where: { id: goal.id },
      data: { createdAt: new Date("2026-07-01T00:00:00Z") },
    });

    const halfway = new Date("2026-07-29T00:00:00Z"); // 4 of 8 weeks elapsed, expect R2000

    const before = await getSavingsGoalStatus(goal.id, halfway);
    expect(before.onPace).toBe(false); // nothing saved yet

    await addContribution(goal.id, 250_000); // R2500, ahead of the R2000 expected

    const after = await getSavingsGoalStatus(goal.id, halfway);
    expect(after.onPace).toBe(true);
    expect(after.currentSavedCents).toBe(250_000);
  });
});
