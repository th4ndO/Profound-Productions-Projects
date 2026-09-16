// Idempotent seed script. Re-running `npm run seed` wipes and recreates the
// demo user's data so the seeded state is always the same, never a growing
// pile of duplicates.
//
// Dates are anchored to "now" (the moment the seed runs) rather than fixed
// calendar dates. That matters specifically for the OPEN period: its
// trailing-14-day burn-rate forecast (INV-2) needs a couple of transactions
// inside "the last 14 days" no matter when a reviewer runs `npm run seed` —
// a hardcoded 2026 date would eventually fall outside that window and the
// forecast would go quietly to zero. The CLOSED period's frozen totals are
// fixed amounts regardless of date, so they read the same in the README
// example forever.
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

const now = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
function daysAgo(n: number): Date {
  return new Date(now.getTime() - n * DAY_MS);
}
function daysFromNow(n: number): Date {
  return new Date(now.getTime() + n * DAY_MS);
}

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
  // Closed period: a semester that already ended. Its totals below are
  // computed with the real closePeriod() function and then frozen, exactly
  // as the app itself would do when a period is closed.
  const closedPeriodRow = await prisma.budgetPeriod.create({
    data: {
      userId: user.id,
      name: "Last Semester (closed)",
      startDate: daysAgo(210),
      endDate: daysAgo(30),
    },
  });

  // Open (live) period: in progress right now.
  const openPeriod = await prisma.budgetPeriod.create({
    data: {
      userId: user.id,
      name: "This Semester (open)",
      startDate: daysAgo(29),
      endDate: daysFromNow(60),
    },
  });

  // --- Income ------------------------------------------------------------
  await prisma.incomeEvent.create({
    data: {
      userId: user.id,
      amountCents: 800_000, // R8 000 NSFAS disbursement
      source: "NSFAS disbursement",
      receivedAt: daysAgo(205),
      periodId: closedPeriodRow.id,
    },
  });

  await prisma.incomeEvent.create({
    data: {
      userId: user.id,
      amountCents: 750_000, // R7 500 NSFAS disbursement
      source: "NSFAS disbursement",
      receivedAt: daysAgo(25),
      periodId: openPeriod.id,
    },
  });
  await prisma.incomeEvent.create({
    data: {
      userId: user.id,
      amountCents: 120_000, // R1 200 part-time job
      source: "Part-time job",
      receivedAt: daysAgo(10),
      periodId: openPeriod.id,
    },
  });

  // --- Transactions --------------------------------------------------
  // Closed period (categoryId set explicitly here to mirror what
  // categorizeTransaction() would have assigned at creation time).
  const closedPeriodTransactions = [
    {
      amountCents: 45_000,
      description: "CHECKERS HYPER PAARL",
      occurredAt: daysAgo(200),
      categoryId: groceries.id,
    },
    {
      amountCents: 12_000,
      description: "UBER TRIP 5521",
      occurredAt: daysAgo(170),
      categoryId: transport.id,
    },
    {
      amountCents: 31_000,
      description: "WOOLWORTHS FOOD",
      occurredAt: daysAgo(140),
      categoryId: groceries.id,
    },
    {
      amountCents: 19_900,
      description: "NETFLIX.COM",
      occurredAt: daysAgo(100),
      categoryId: entertainment.id,
    },
    {
      // Deliberately uncategorized: no rule matches "printing". This is
      // the INV-1 walkthrough record for the CLOSED period — it still
      // counts in frozenSpendCents below.
      amountCents: 8_500,
      description: "CAMPUS PRINTING KIOSK",
      occurredAt: daysAgo(60),
      categoryId: null,
    },
  ];

  for (const t of closedPeriodTransactions) {
    await prisma.transaction.create({
      data: { userId: user.id, source: "MANUAL", periodId: closedPeriodRow.id, ...t },
    });
  }

  // Open period. Two of these (6 and 2 days ago) fall inside the trailing
  // 14-day burn-rate window no matter what day this is run, so the live
  // forecast always has real, non-zero data to show.
  const openPeriodTransactions = [
    {
      amountCents: 15_000,
      description: "SPAR EXPRESS CAMPUS",
      occurredAt: daysAgo(20),
      categoryId: groceries.id,
    },
    {
      amountCents: 6_500,
      description: "BOLT RIDE",
      occurredAt: daysAgo(6),
      categoryId: transport.id,
    },
    {
      amountCents: 9_900,
      description: "SHOWMAX SUBSCRIPTION",
      occurredAt: daysAgo(15),
      categoryId: entertainment.id,
    },
    {
      // Deliberately uncategorized: the INV-1 walkthrough record for the
      // OPEN period — visible on the live dashboard, never dropped.
      amountCents: 4_000,
      description: "CAMPUS PRINTING KIOSK",
      occurredAt: daysAgo(2),
      categoryId: null,
    },
    {
      amountCents: 22_000,
      description: "PNP GROCER",
      occurredAt: daysAgo(1),
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
      receivedAt: daysAgo(205),
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
      targetDate: daysFromNow(90),
      createdAt: daysAgo(30),
    },
  });

  await prisma.savingsContribution.create({
    data: { goalId: goal.id, amountCents: 200_000, contributedAt: daysAgo(25) },
  });
  await prisma.savingsContribution.create({
    data: { goalId: goal.id, amountCents: 150_000, contributedAt: daysAgo(10) },
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
