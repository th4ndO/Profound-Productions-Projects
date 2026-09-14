"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { wouldCreateCycle } from "@/lib/costing-db";
import { CircularRecipeError } from "@/costing";

export interface FormState {
  error: string | null;
}

export async function createRecipeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const yieldUnitId = String(formData.get("yieldUnitId") ?? "");
  const isSubRecipe = formData.get("isSubRecipe") === "on";
  const standardYieldQty = Number(formData.get("standardYieldQty"));
  const incidentalsRate = Number(formData.get("incidentalsRate") ?? 0);

  if (!name || !yieldUnitId) {
    return { error: "Name and yield unit are required." };
  }
  if (!Number.isFinite(standardYieldQty) || standardYieldQty <= 0) {
    return { error: "Standard yield must be a positive number." };
  }
  if (!Number.isFinite(incidentalsRate) || incidentalsRate < 0 || incidentalsRate > 100) {
    return { error: "Incidentals rate must be between 0 and 100." };
  }

  const existing = await prisma.recipe.findUnique({ where: { name } });
  if (existing) {
    return { error: `A recipe named "${name}" already exists.` };
  }

  const recipe = await prisma.recipe.create({
    data: { name, standardYieldQty, yieldUnitId, incidentalsRate, isSubRecipe },
  });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipeAction(
  recipeId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const yieldUnitId = String(formData.get("yieldUnitId") ?? "");
  const isSubRecipe = formData.get("isSubRecipe") === "on";
  const standardYieldQty = Number(formData.get("standardYieldQty"));
  const incidentalsRate = Number(formData.get("incidentalsRate") ?? 0);

  if (!name || !yieldUnitId) {
    return { error: "Name and yield unit are required." };
  }
  if (!Number.isFinite(standardYieldQty) || standardYieldQty <= 0) {
    return { error: "Standard yield must be a positive number." };
  }
  if (!Number.isFinite(incidentalsRate) || incidentalsRate < 0 || incidentalsRate > 100) {
    return { error: "Incidentals rate must be between 0 and 100." };
  }

  const clash = await prisma.recipe.findUnique({ where: { name } });
  if (clash && clash.id !== recipeId) {
    return { error: `A recipe named "${name}" already exists.` };
  }

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { name, standardYieldQty, yieldUnitId, incidentalsRate, isSubRecipe },
  });

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  return { error: null };
}

/**
 * Add one recipe line. Enforces the ingredient/childRecipe XOR in
 * application code (the SQLite triggers are a database-level backstop, not
 * the only guard — see the recipe_line_xor_check migration) and, for a
 * sub-recipe line, checks INV-2 on write: refuses to create a line that
 * would close a cycle anywhere in the recipe graph, and reports the exact
 * cycle path rather than a generic error.
 */
export async function addLineAction(
  recipeId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(["ADMIN"]);

  const lineType = String(formData.get("lineType") ?? "");
  const ingredientId = String(formData.get("ingredientId") ?? "") || null;
  const childRecipeId = String(formData.get("childRecipeId") ?? "") || null;
  const unitId = String(formData.get("unitId") ?? "");
  const quantity = Number(formData.get("quantity"));

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be a positive number." };
  }
  if (!unitId) {
    return { error: "Unit is required." };
  }

  if (lineType === "ingredient") {
    if (!ingredientId) {
      return { error: "Select an ingredient." };
    }
    await prisma.recipeLine.create({
      data: { recipeId, ingredientId, childRecipeId: null, quantity, unitId },
    });
  } else if (lineType === "subrecipe") {
    if (!childRecipeId) {
      return { error: "Select a sub-recipe." };
    }
    if (childRecipeId === recipeId) {
      return { error: `A recipe cannot contain itself as a sub-recipe.` };
    }
    const cyclePath = await wouldCreateCycle(recipeId, childRecipeId);
    if (cyclePath) {
      const err = new CircularRecipeError(cyclePath);
      return { error: err.message };
    }
    await prisma.recipeLine.create({
      data: { recipeId, ingredientId: null, childRecipeId, quantity, unitId },
    });
  } else {
    return { error: "Choose whether this line is an ingredient or a sub-recipe." };
  }

  revalidatePath(`/recipes/${recipeId}`);
  return { error: null };
}

export async function deleteLineAction(recipeId: string, lineId: string): Promise<void> {
  await requireUser(["ADMIN"]);
  await prisma.recipeLine.delete({ where: { id: lineId } });
  revalidatePath(`/recipes/${recipeId}`);
}
