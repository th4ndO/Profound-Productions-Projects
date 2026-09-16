"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session-guard";
import { closePeriodById, createPeriod } from "@/lib/periods";

export interface FormState {
  error: string | null;
}

export async function createPeriodAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const startDate = new Date(String(formData.get("startDate") ?? ""));
  const endDate = new Date(String(formData.get("endDate") ?? ""));

  if (!name) return { error: "Name is required." };
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: "Enter valid start and end dates." };
  }

  try {
    await createPeriod(user.id, name, startDate, endDate);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create period." };
  }

  revalidatePath("/periods");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function closePeriodAction(formData: FormData): Promise<void> {
  await requireUser();
  const periodId = String(formData.get("periodId") ?? "");
  if (!periodId) return;

  await closePeriodById(periodId);

  revalidatePath("/periods");
  revalidatePath("/dashboard");
  redirect(`/periods/${periodId}`);
}
