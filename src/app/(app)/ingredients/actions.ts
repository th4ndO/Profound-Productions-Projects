"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { recordIngredientPrice } from "@/lib/costing-db";
import { InvalidPriceError, InvalidYieldError } from "@/costing";

export interface FormState {
  error: string | null;
}

function parsePositiveFloat(raw: FormDataEntryValue | null, label: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidYieldError(`${label} must be a positive number`);
  }
  return value;
}

function parsePriceCents(raw: FormDataEntryValue | null): number {
  // The form collects Rand (e.g. "45.00"); persist as integer cents.
  const rand = Number(raw);
  if (!Number.isFinite(rand)) {
    throw new InvalidPriceError("price must be a number");
  }
  return Math.round(rand * 100);
}

export async function createIngredientAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "BUYER"]);

  const name = String(formData.get("name") ?? "").trim();
  const purchaseUnitId = String(formData.get("purchaseUnitId") ?? "");
  const recipeUnitId = String(formData.get("recipeUnitId") ?? "");
  const supplier = String(formData.get("supplier") ?? "").trim() || undefined;
  const yieldPercentRaw = String(formData.get("yieldPercent") ?? "100");

  if (!name || !purchaseUnitId || !recipeUnitId) {
    return { error: "Name, purchase unit and recipe unit are required." };
  }

  let purchaseQuantity: number;
  let yieldPercent: number;
  let priceCents: number | null = null;
  try {
    purchaseQuantity = parsePositiveFloat(formData.get("purchaseQuantity"), "Purchase quantity");
    yieldPercent = Number(yieldPercentRaw);
    if (!Number.isFinite(yieldPercent) || yieldPercent <= 0 || yieldPercent > 100) {
      return { error: "Yield percent must be greater than 0 and at most 100." };
    }
    const priceRaw = formData.get("initialPriceRand");
    if (priceRaw && String(priceRaw).trim() !== "") {
      priceCents = parsePriceCents(priceRaw);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid input." };
  }

  const existing = await prisma.ingredient.findUnique({ where: { name } });
  if (existing) {
    return { error: `An ingredient named "${name}" already exists.` };
  }

  const ingredient = await prisma.ingredient.create({
    data: { name, purchaseUnitId, purchaseQuantity, recipeUnitId, yieldPercent, supplier },
  });

  if (priceCents !== null) {
    await recordIngredientPrice(ingredient.id, priceCents, "initial price");
  }

  revalidatePath("/ingredients");
  redirect(`/ingredients/${ingredient.id}`);
}

export async function updateIngredientAction(
  ingredientId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "BUYER"]);

  const name = String(formData.get("name") ?? "").trim();
  const purchaseUnitId = String(formData.get("purchaseUnitId") ?? "");
  const recipeUnitId = String(formData.get("recipeUnitId") ?? "");
  const supplier = String(formData.get("supplier") ?? "").trim() || null;

  if (!name || !purchaseUnitId || !recipeUnitId) {
    return { error: "Name, purchase unit and recipe unit are required." };
  }

  let purchaseQuantity: number;
  let yieldPercent: number;
  try {
    purchaseQuantity = parsePositiveFloat(formData.get("purchaseQuantity"), "Purchase quantity");
    yieldPercent = Number(formData.get("yieldPercent"));
    if (!Number.isFinite(yieldPercent) || yieldPercent <= 0 || yieldPercent > 100) {
      return { error: "Yield percent must be greater than 0 and at most 100." };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid input." };
  }

  const clash = await prisma.ingredient.findUnique({ where: { name } });
  if (clash && clash.id !== ingredientId) {
    return { error: `An ingredient named "${name}" already exists.` };
  }

  await prisma.ingredient.update({
    where: { id: ingredientId },
    data: { name, purchaseUnitId, purchaseQuantity, recipeUnitId, yieldPercent, supplier },
  });

  revalidatePath("/ingredients");
  revalidatePath(`/ingredients/${ingredientId}`);
  return { error: null };
}

export async function addPriceAction(
  ingredientId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "BUYER"]);

  const source = String(formData.get("source") ?? "").trim() || undefined;
  let priceCents: number;
  try {
    priceCents = parsePriceCents(formData.get("priceRand"));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid price." };
  }

  try {
    await recordIngredientPrice(ingredientId, priceCents, source);
  } catch (err) {
    if (err instanceof InvalidPriceError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath(`/ingredients/${ingredientId}`);
  revalidatePath("/alerts");
  return { error: null };
}
