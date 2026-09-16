import { categorizeTransaction } from "@/budgeting";
import { prisma } from "./prisma";
import { getUserRuleTable } from "./categories";

export type TransactionSource = "MANUAL" | "CSV_IMPORT";

export interface NewTransactionInput {
  userId: string;
  amountCents: number;
  description: string;
  occurredAt: Date;
  source: TransactionSource;
  periodId?: string | null;
}

/** Creates a transaction, auto-categorizing it against the user's current rules. */
export async function createTransaction(input: NewTransactionInput) {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Transaction amount must be a positive number of cents");
  }

  const rules = await getUserRuleTable(input.userId);
  const categoryId = categorizeTransaction(input.description, rules);

  return prisma.transaction.create({
    data: {
      userId: input.userId,
      amountCents: input.amountCents,
      description: input.description,
      occurredAt: input.occurredAt,
      source: input.source,
      periodId: input.periodId ?? null,
      categoryId,
    },
  });
}

/**
 * Changes (or clears) a transaction's category. This never touches
 * BudgetPeriod.frozen* fields — a closed period's stored totals are
 * computed once, at close time, and are never recomputed from live
 * transaction data afterward (INV-3).
 */
export async function recategorizeTransaction(transactionId: string, categoryId: string | null) {
  return prisma.transaction.update({
    where: { id: transactionId },
    data: { categoryId },
  });
}

export interface ParsedCsvRow {
  occurredAt: Date;
  description: string;
  amountCents: number;
}

/**
 * Parses a bank-exported CSV with header `date,description,amount` where
 * amount is a decimal Rand value (e.g. "125.00"). This is a deliberately
 * simple, local, in-process parser — no external service, no quoted-comma
 * support (see README known limitations).
 */
export function parseTransactionsCsv(csvText: string): ParsedCsvRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const [header, ...rows] = lines;
  const looksLikeHeader = /date/i.test(header ?? "") && /description/i.test(header ?? "");
  const dataRows = looksLikeHeader ? rows : lines;

  return dataRows.map((line, index) => {
    const parts = line.split(",");
    if (parts.length < 3) {
      throw new Error(`CSV row ${index + 1} does not have date,description,amount: "${line}"`);
    }
    const [rawDate, ...rest] = parts;
    const rawAmount = rest.pop() as string;
    const description = rest.join(",").trim();

    const occurredAt = new Date((rawDate ?? "").trim());
    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error(`CSV row ${index + 1} has an unparseable date: "${rawDate}"`);
    }

    const amountCents = Math.round(parseFloat(rawAmount.trim()) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new Error(`CSV row ${index + 1} has an invalid amount: "${rawAmount}"`);
    }

    return { occurredAt, description, amountCents };
  });
}

/** Imports already-parsed CSV rows as transactions, auto-categorized. */
export async function importCsvTransactions(
  userId: string,
  rows: ParsedCsvRow[],
  periodId?: string | null,
) {
  const rules = await getUserRuleTable(userId);

  const created = [];
  for (const row of rows) {
    const categoryId = categorizeTransaction(row.description, rules);
    created.push(
      await prisma.transaction.create({
        data: {
          userId,
          amountCents: row.amountCents,
          description: row.description,
          occurredAt: row.occurredAt,
          source: "CSV_IMPORT",
          periodId: periodId ?? null,
          categoryId,
        },
      }),
    );
  }
  return created;
}
