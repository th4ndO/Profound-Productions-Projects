"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { createTransaction, importCsvTransactions, parseTransactionsCsv, recategorizeTransaction } from "@/lib/transactions";

export interface FormState {
  error: string | null;
  success: string | null;
}

function parseAmountToCents(raw: string): number {
  const value = Math.round(parseFloat(raw) * 100);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a positive number, e.g. 125.00");
  }
  return value;
}

export async function createTransactionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("occurredAt") ?? "");
  const periodId = String(formData.get("periodId") ?? "") || null;

  if (!description) return { error: "Description is required.", success: null };

  const occurredAt = new Date(dateRaw);
  if (Number.isNaN(occurredAt.getTime())) {
    return { error: "Enter a valid date.", success: null };
  }

  try {
    const amountCents = parseAmountToCents(amountRaw);
    await createTransaction({
      userId: user.id,
      amountCents,
      description,
      occurredAt,
      source: "MANUAL",
      periodId,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add transaction.", success: null };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { error: null, success: "Transaction added." };
}

export interface CsvPreviewState {
  error: string | null;
  rowCount: number;
  totalCents: number;
  preview: { description: string; occurredAt: string; amountCents: number }[];
}

export async function previewCsvAction(_prev: CsvPreviewState, formData: FormData): Promise<CsvPreviewState> {
  await requireUser();
  const csvText = String(formData.get("csvText") ?? "");

  try {
    const rows = parseTransactionsCsv(csvText);
    if (rows.length === 0) {
      return { error: "No rows found in that CSV.", rowCount: 0, totalCents: 0, preview: [] };
    }
    return {
      error: null,
      rowCount: rows.length,
      totalCents: rows.reduce((sum, r) => sum + r.amountCents, 0),
      preview: rows
        .slice(0, 10)
        .map((r) => ({ description: r.description, occurredAt: r.occurredAt.toISOString(), amountCents: r.amountCents })),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not parse CSV.",
      rowCount: 0,
      totalCents: 0,
      preview: [],
    };
  }
}

export async function confirmCsvImportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const csvText = String(formData.get("csvText") ?? "");
  const periodId = String(formData.get("periodId") ?? "") || null;

  try {
    const rows = parseTransactionsCsv(csvText);
    const created = await importCsvTransactions(user.id, rows, periodId);
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { error: null, success: `Imported ${created.length} transaction(s).` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Import failed.", success: null };
  }
}

export async function recategorizeAction(formData: FormData): Promise<void> {
  await requireUser();
  const transactionId = String(formData.get("transactionId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "") || null;

  await recategorizeTransaction(transactionId, categoryId);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
