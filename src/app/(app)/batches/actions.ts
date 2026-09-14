"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { buildRecipeContext, scaleRecipeById } from "@/lib/costing-db";
import {
  purchaseUnitCostCents,
  recipeUnitCostCents,
  edibleUnitCostCents,
  convert,
  roundHalfUpCents,
  CostingError,
} from "@/costing";

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

/**
 * INV-3: freeze the batch's cost. Runs once, on the PLANNED/../COMPLETED ->
 * COSTED transition. Every ingredient's edible-portion unit cost *at this
 * moment* is written into BatchLine.unitCostCents — a deliberate
 * denormalisation (see the BatchLine schema comment) so that a later
 * IngredientPrice row can never change what a completed batch is recorded
 * as having cost. Nothing about this batch is ever recomputed after this
 * point; the detail page reads these frozen columns back verbatim once
 * status is COSTED, rather than re-running the live costing path.
 */
async function freezeBatchCosting(batchId: string): Promise<void> {
  const batch = await prisma.batch.findUniqueOrThrow({ where: { id: batchId } });
  const [ctx, scaledLines] = await Promise.all([
    buildRecipeContext(),
    scaleRecipeById(batch.recipeId, batch.targetYield),
  ]);
  const recipe = ctx.recipes.get(batch.recipeId);
  if (!recipe) {
    throw new CostingError(`recipe not found: "${batch.recipeId}"`);
  }

  const aggregatedQtyByIngredient = new Map<string, number>();
  for (const line of scaledLines) {
    aggregatedQtyByIngredient.set(
      line.ingredientId,
      (aggregatedQtyByIngredient.get(line.ingredientId) ?? 0) + line.quantity,
    );
  }

  let ingredientTotalFull = 0;
  const batchLineData: Array<{
    ingredientId: string;
    scaledQuantity: number;
    unitCostCents: number;
    lineCostCents: number;
  }> = [];

  for (const [ingredientId, quantity] of aggregatedQtyByIngredient) {
    const ingredient = ctx.ingredients.get(ingredientId);
    if (!ingredient) {
      throw new CostingError(`ingredient not found: "${ingredientId}"`);
    }
    if (ingredient.priceCents === null) {
      throw new CostingError(`no price recorded for ingredient "${ingredient.name}"`);
    }
    const apUnitCostCents = purchaseUnitCostCents(ingredient.priceCents, ingredient.purchaseQuantity);
    const factor = convert(1, ingredient.purchaseUnitId, ingredient.recipeUnitId, ctx.conversions);
    const apRecipeUnitCostCents = recipeUnitCostCents(apUnitCostCents, factor);
    const epUnitCostCents = edibleUnitCostCents(apRecipeUnitCostCents, ingredient.yieldPercent);

    const lineCostFull = epUnitCostCents * quantity;
    ingredientTotalFull += lineCostFull;

    batchLineData.push({
      ingredientId,
      scaledQuantity: quantity,
      unitCostCents: roundHalfUpCents(epUnitCostCents),
      lineCostCents: roundHalfUpCents(lineCostFull),
    });
  }

  const costedTotalCents = roundHalfUpCents(
    ingredientTotalFull * (1 + recipe.incidentalsRate / 100),
  );
  const costedUnitCents = roundHalfUpCents(costedTotalCents / batch.targetYield);

  await prisma.$transaction([
    prisma.batchLine.deleteMany({ where: { batchId } }),
    prisma.batchLine.createMany({
      data: batchLineData.map((line) => ({ batchId, ...line })),
    }),
    prisma.batch.update({
      where: { id: batchId },
      data: {
        status: "COSTED",
        costedTotalCents,
        costedUnitCents,
        costedAt: new Date(),
      },
    }),
  ]);
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
