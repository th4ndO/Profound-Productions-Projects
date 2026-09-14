"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { freezeBatchCosting } from "@/lib/costing-db";
import { CostingError } from "@/costing";

import { ALLOWED_TRANSITIONS, BATCH_STATUSES, type BatchStatus } from "./batch-status";

export interface FormState {
  error: string | null;
}

export async function createBatchAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "PRODUCTION"]);

  const recipeId = String(formData.get("recipeId") ?? "");
  const targetYield = Number(formData.get("targetYield"));
  const plannedForRaw = String(formData.get("plannedFor") ?? "");

  if (!recipeId) {
    return { error: "Choose a recipe." };
  }
  if (!Number.isFinite(targetYield) || targetYield <= 0) {
    return { error: "Target yield must be a positive number." };
  }
  const plannedFor = new Date(plannedForRaw);
  if (Number.isNaN(plannedFor.getTime())) {
    return { error: "Choose a valid planned-for date." };
  }

  const batch = await prisma.batch.create({
    data: { recipeId, targetYield, plannedFor, status: "PLANNED" },
  });

  revalidatePath("/batches");
  redirect(`/batches/${batch.id}`);
}

export async function advanceBatchStatusAction(
  batchId: string,
  targetStatus: string,
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "PRODUCTION"]);

  if (!BATCH_STATUSES.includes(targetStatus as BatchStatus)) {
    return { error: `Unknown status "${targetStatus}".` };
  }

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return { error: "Batch not found." };
  }

  const currentStatus = batch.status as BatchStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus as BatchStatus)) {
    return { error: `Cannot move a batch from ${currentStatus} to ${targetStatus}.` };
  }

  if (targetStatus === "COSTED") {
    try {
      // INV-3: see freezeBatchCosting's own doc comment in costing-db.ts.
      await freezeBatchCosting(batchId);
    } catch (err) {
      return {
        error: err instanceof CostingError ? err.message : "This batch cannot be costed yet.",
      };
    }
  } else {
    await prisma.batch.update({ where: { id: batchId }, data: { status: targetStatus } });
  }

  revalidatePath(`/batches/${batchId}`);
  revalidatePath("/batches");
  return { error: null };
}
