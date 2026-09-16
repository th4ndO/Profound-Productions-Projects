"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { addContribution, createSavingsGoal } from "@/lib/savingsGoals";

export interface FormState {
  error: string | null;
}

export async function createGoalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const targetRaw = String(formData.get("targetAmount") ?? "");
  const targetDate = new Date(String(formData.get("targetDate") ?? ""));

  if (!name) return { error: "Name is required." };
  const targetCents = Math.round(parseFloat(targetRaw) * 100);
  if (!Number.isFinite(targetCents) || targetCents <= 0) {
    return { error: "Target amount must be a positive number." };
  }
  if (Number.isNaN(targetDate.getTime())) {
    return { error: "Enter a valid target date." };
  }

  try {
    await createSavingsGoal(user.id, name, targetCents, targetDate);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create goal." };
  }

  revalidatePath("/savings");
  return { error: null };
}

export async function addContributionAction(formData: FormData): Promise<void> {
  await requireUser();
  const goalId = String(formData.get("goalId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const amountCents = Math.round(parseFloat(amountRaw) * 100);

  if (!goalId || !Number.isFinite(amountCents) || amountCents <= 0) return;

  await addContribution(goalId, amountCents);
  revalidatePath("/savings");
}
