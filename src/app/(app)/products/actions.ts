"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export interface FormState {
  error: string | null;
}

function parseRandToCents(raw: FormDataEntryValue | null): number | null {
  const rand = Number(raw);
  if (!Number.isFinite(rand)) return null;
  return Math.round(rand * 100);
}

export async function createProductAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "BUYER"]);

  const recipeId = String(formData.get("recipeId") ?? "");
  const sellingPriceCents = parseRandToCents(formData.get("sellingPriceRand"));
  const minMarginPercent = Number(formData.get("minMarginPercent") ?? 0);

  if (!recipeId) {
    return { error: "Choose a recipe." };
  }
  if (sellingPriceCents === null || sellingPriceCents <= 0) {
    return { error: "Selling price must be a positive amount." };
  }
  if (!Number.isFinite(minMarginPercent) || minMarginPercent < 0 || minMarginPercent > 100) {
    return { error: "Minimum margin must be between 0 and 100." };
  }

  const existing = await prisma.product.findUnique({ where: { recipeId } });
  if (existing) {
    return { error: "This recipe already has a product." };
  }

  const product = await prisma.product.create({
    data: { recipeId, sellingPriceCents, minMarginPercent, active: true },
  });

  revalidatePath("/products");
  redirect(`/products/${product.id}`);
}

export async function updateProductAction(
  productId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN", "BUYER"]);

  const sellingPriceCents = parseRandToCents(formData.get("sellingPriceRand"));
  const minMarginPercent = Number(formData.get("minMarginPercent") ?? 0);
  const active = formData.get("active") === "on";

  if (sellingPriceCents === null || sellingPriceCents <= 0) {
    return { error: "Selling price must be a positive amount." };
  }
  if (!Number.isFinite(minMarginPercent) || minMarginPercent < 0 || minMarginPercent > 100) {
    return { error: "Minimum margin must be between 0 and 100." };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { sellingPriceCents, minMarginPercent, active },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { error: null };
}
