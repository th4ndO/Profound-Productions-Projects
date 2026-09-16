"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { addCategoryRule, createCategory, deleteCategoryRule } from "@/lib/categories";

export interface FormState {
  error: string | null;
}

export async function createCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "");

  try {
    await createCategory(user.id, name);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create category." };
  }

  revalidatePath("/categories");
  return { error: null };
}

export async function addRuleAction(formData: FormData): Promise<void> {
  await requireUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const keyword = String(formData.get("keyword") ?? "");
  if (!categoryId || !keyword.trim()) return;

  await addCategoryRule(categoryId, keyword);
  revalidatePath("/categories");
}

export async function deleteRuleAction(formData: FormData): Promise<void> {
  await requireUser();
  const ruleId = String(formData.get("ruleId") ?? "");
  if (!ruleId) return;

  await deleteCategoryRule(ruleId);
  revalidatePath("/categories");
}
