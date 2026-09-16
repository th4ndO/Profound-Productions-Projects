// Idempotent seed script. Re-running `npm run seed` wipes and recreates the
// demo user's data so the seeded state is always the same, never a growing
// pile of duplicates.
//
// See README.md for how this data maps onto the INV-1/INV-2/INV-3
// walkthrough, and prisma/schema.prisma / BUILD SPEC §5 for the model.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { closePeriod } from "../src/budgeting/period";
import type { BudgetPeriod, IncomeEvent, Transaction } from "../src/budgeting/types";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@student.co.za";
const DEMO_PASSWORD = "password123";

async function wipeExistingDemoData() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!existing) return;

  const userId = existing.id;

  const goals = await prisma.savingsGoal.findMany({ where: { userId }, select: { id: true } });
  await prisma.savingsContribution.deleteMany({
    where: { goalId: { in: goals.map((g) => g.id) } },
  });
  await prisma.savingsGoal.deleteMany({ where: { userId } });

  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.incomeEvent.deleteMany({ where: { userId } });
  await prisma.budgetPeriod.deleteMany({ where: { userId } });

  const categories = await prisma.category.findMany({ where: { userId }, select: { id: true } });
  await prisma.categoryRule.deleteMany({ where: { categoryId: { in: categories.map((c) => c.id) } } });
  await prisma.category.deleteMany({ where: { userId } });

  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  console.log(`Seeding demo data for ${DEMO_EMAIL} ...`);
  await wipeExistingDemoData();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, passwordHash },
  });

  // --- Categories + keyword rules -----------------------------------
  const groceries = await prisma.category.create({
    data: { userId: user.id, name: "Groceries", isSystem: true },
  });
  const transport = await prisma.category.create({
    data: { userId: user.id, name: "Transport", isSystem: true },
  });
  const entertainment = await prisma.category.create({
    data: { userId: user.id, name: "Entertainment", isSystem: true },
  });

  await prisma.categoryRule.createMany({
    data: [
      { categoryId: groceries.id, keyword: "checkers" },
      { categoryId: groceries.id, keyword: "woolworths" },
      { categoryId: groceries.id, keyword: "pnp" },
      { categoryId: groceries.id, keyword: "spar" },
      { categoryId: transport.id, keyword: "uber" },
      { categoryId: transport.id, keyword: "bolt" },
      { categoryId: transport.id, keyword: "taxi" },
      { categoryId: entertainment.id, keyword: "netflix" },
      { categoryId: entertainment.id, keyword: "showmax" },
    ],
  });

  // --- Budget periods --------------------------------------------------
  // Closed period: last (already-ended) semester. Its totals below are
  // computed with the real closePeriod() function and then frozen, exactly
  // as the app itself would do when a period is closed.
  const closedPeriodRow = await prisma.budgetPeriod.create({
    data: {
      userId: user.id,
      name: "2026 Semester 1",
      startDate: new Date("2026-01-01T00:00:00Z"),
      endDate: new Date("2026-06-30T23:59:59Z"),
    },
  });

  // Open (live) period: the current, in-progress semester.
  const openPeriod = await prisma.budgetPeriod.create({
    data: {
      userId: user.id,
      name: "2026 Semester 2",
      startDate: new Date("2026-07-01T00:00:00Z"),
      endDate: new Date("2026-11-30T23:59:59Z"),
    },
  });

  // --- Income ------------------------------------------------------------
  await prisma.incomeEvent.create({
    data: {
      userId: user.id,
      amountCents: 800_000, // R8 000 NSFAS disbursement
      source: "NSFAS disbursement",
      receivedAt: new Date("2026-01-05T09:00:00Z"),
      periodId: closedPeriodRow.id,
    },
  });

  await prisma.incomeEvent.create({
    data: {
      userId: user.id,
      amountCents: 750_000, // R7 500 NSFAS disbursement
      source: "NSFAS disbursement",
      receivedAt: new Date("2026-07-05T09:00:00Z"),
      periodId: openPeriod.id,
    },
  });
  await prisma.incomeEvent.create({
    data: {
      userId: user.id,
      amountCents: 120_000, // R1 200 part-time job
      source: "Part-time job",
      receivedAt: new Date("2026-08-20T09:00:00Z"),
      periodId: openPeriod.id,
    },
  });

  // --- Transactions --------------------------------------------------
  // Closed period (categorized by matching a rule at creation time, just
  // like the app does — categoryId is set explicitly here to mirror that).
  const closedPeriodTransactions = [
    {
      amountCents: 45_000,
      description: "CHECKERS HYPER PAARL",
      occurredAt: new Date("2026-01-10T12:00:00Z"),
      categoryId: groceries.id,
    },
    {
      amountCents: 12_000,
      description: "UBER TRIP 5521",
      occurredAt: new Date("2026-02-14T08:30:00Z"),
      categoryId: transport.id,
    },
    {
      amountCents: 31_000,
      description: "WOOLWORTHS FOOD",
      occurredAt: new Date("2026-03-02T17:15:00Z"),
      categoryId: groceries.id,
    },
    {
      amountCents: 19_900,
      description: "NETFLIX.COM",
      occurredAt: new Date("2026-04-01T00:05:00Z"),
      categoryId: entertainment.id,
    },
    {
      // Deliberately uncategorized: no rule matches "printing". This is
      // the INV-1 walkthrough record for the CLOSED period — it still
      // counts in frozenSpendCents below.
      amountCents: 8_500,
      description: "CAMPUS PRINTING KIOSK",
      occurredAt: new Date("2026-05-05T10:00:00Z"),
      categoryId: null,
    },
  ];

  for (const t of closedPeriodTransactions) {
    await prisma.transaction.create({
      data: { userId: user.id, source: "MANUAL", periodId: closedPeriodRow.id, ...t },
    });
  }

  // Open period. Two of these are dated in the trailing 14-day window as
  // of any "today" on/after 2026-09-13, so the live burn-rate forecast has
  // real, non-zero data to show.
  const openPeriodTransactions = [
    {
      amountCents: 15_000,
      description: "SPAR EXPRESS CAMPUS",
      occurredAt: new Date("2026-09-05T11:00:00Z"),
      categoryId: groceries.id,
    },
    {
      amountCents: 6_500,
      description: "BOLT RIDE",
      occurredAt: new Date("2026-09-10T07:45:00Z"),
      categoryId: transport.id,
    },
    {
      amountCents: 9_900,
      description: "SHOWMAX SUBSCRIPTION",
      occurredAt: new Date("2026-08-25T00:05:00Z"),
      categoryId: entertainment.id,
    },
    {
      // Deliberately uncategorized: the INV-1 walkthrough record for the
      // OPEN period — visible on the live dashboard, never dropped.
      amountCents: 4_000,
      description: "CAMPUS PRINTING KIOSK",
      occurredAt: new Date("2026-09-12T10:00:00Z"),
      categoryId: null,
    },
    {
      amountCents: 22_000,
      description: "PNP GROCER",
      occurredAt: new Date("2026-09-14T18:20:00Z"),
      categoryId: groceries.id,
    },
  ];

  for (const t of openPeriodTransactions) {
    await prisma.transaction.create({
      data: { userId: user.id, source: "MANUAL", periodId: openPeriod.id, ...t },
    });
  }

  // --- Close the closed period, using the real budgeting logic ----------
  const coreClosedPeriod: BudgetPeriod = {
    id: closedPeriodRow.id,
    userId: user.id,
    name: closedPeriodRow.name,
    startDate: closedPeriodRow.startDate,
    endDate: closedPeriodRow.endDate,
    closed: false,
    closedAt: null,
    frozenIncomeCents: null,
    frozenSpendCents: null,
    frozenEndBalanceCents: null,
  };
  const coreTransactions: Transaction[] = closedPeriodTransactions.map((t, i) => ({
    id: `seed-tx-${i}`,
    userId: user.id,
    amountCents: t.amountCents,
    description: t.description,
    occurredAt: t.occurredAt,
    categoryId: t.categoryId,
    source: "MANUAL",
    periodId: closedPeriodRow.id,
  }));
  const coreIncome: IncomeEvent[] = [
    {
      id: "seed-income-0",
      userId: user.id,
      amountCents: 800_000,
      source: "NSFAS disbursement",
      receivedAt: new Date("2026-01-05T09:00:00Z"),
      periodId: closedPeriodRow.id,
    },
  ];

  const totals = closePeriod(coreClosedPeriod, coreTransactions, coreIncome);

  await prisma.budgetPeriod.update({
    where: { id: closedPeriodRow.id },
    data: {
      closed: true,
      closedAt: totals.closedAt,
      frozenIncomeCents: totals.frozenIncomeCents,
      frozenSpendCents: totals.frozenSpendCents,
      frozenEndBalanceCents: totals.frozenEndBalanceCents,
    },
  });

  console.log(
    `  closed "${closedPeriodRow.name}": income R${totals.frozenIncomeCents / 100}, ` +
      `spend R${totals.frozenSpendCents / 100}, balance R${totals.frozenEndBalanceCents / 100}`,
  );

  // --- Savings goal + contributions (append-only log) --------------------
  const goal = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: "Laptop fund",
      targetCents: 1_200_000, // R12 000
      targetDate: new Date("2026-12-31T00:00:00Z"),
      createdAt: new Date("2026-07-01T00:00:00Z"),
    },
  });

  await prisma.savingsContribution.create({
    data: { goalId: goal.id, amountCents: 200_000, contributedAt: new Date("2026-07-10T00:00:00Z") },
  });
  await prisma.savingsContribution.create({
    data: { goalId: goal.id, amountCents: 150_000, contributedAt: new Date("2026-08-15T00:00:00Z") },
  });

  console.log(`Seed complete. Log in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
