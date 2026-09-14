/**
 * Bridges the database to the pure `src/costing/` module: loads Prisma rows
 * into the plain-object shapes costing functions expect, and translates
 * their results back. Nothing in src/costing/ imports Prisma — this file
 * is the only place that does both.
 */
import { prisma } from "./db";
import {
  costRecipe as costRecipePure,
  detectCycle as detectCyclePure,
  scaleRecipe as scaleRecipePure,
  purchaseList as purchaseListPure,
  marginPercent,
  CircularRecipeError,
  InvalidPriceError,
} from "@/costing";
import type {
  ConversionTable,
  IngredientCostInput,
  IngredientRef,
  PurchaseLine,
  RecipeContext,
  RecipeCost,
  RecipeInput,
  ResolvedRecipe,
  ScaledLine,
} from "@/costing";

export async function loadConversionTable(): Promise<ConversionTable> {
  const rows = await prisma.unitConversion.findMany();
  return rows.map((row) => ({
    fromUnitId: row.fromUnitId,
    toUnitId: row.toUnitId,
    factor: row.factor,
  }));
}

/** Latest IngredientPrice row per ingredient (effectiveFrom DESC), or
 * `null` where an ingredient has never had a price recorded — which is
 * exactly the input costRecipe needs to raise MissingPriceError (INV-1). */
async function loadLatestPrices(): Promise<Map<string, number>> {
  const rows = await prisma.ingredientPrice.findMany({
    orderBy: { effectiveFrom: "desc" },
  });
  const latest = new Map<string, number>();
  for (const row of rows) {
    if (!latest.has(row.ingredientId)) {
      latest.set(row.ingredientId, row.priceCents);
    }
  }
  return latest;
}

export async function buildRecipeContext(): Promise<RecipeContext> {
  const [recipes, recipeLines, ingredients, conversions, latestPrices] =
    await Promise.all([
      prisma.recipe.findMany(),
      prisma.recipeLine.findMany(),
      prisma.ingredient.findMany(),
      loadConversionTable(),
      loadLatestPrices(),
    ]);

  const linesByRecipe = new Map<string, typeof recipeLines>();
  for (const line of recipeLines) {
    const list = linesByRecipe.get(line.recipeId) ?? [];
    list.push(line);
    linesByRecipe.set(line.recipeId, list);
  }

  const recipeMap = new Map<string, RecipeInput>();
  for (const recipe of recipes) {
    recipeMap.set(recipe.id, {
      id: recipe.id,
      name: recipe.name,
      standardYieldQty: recipe.standardYieldQty,
      yieldUnitId: recipe.yieldUnitId,
      incidentalsRate: recipe.incidentalsRate,
      lines: (linesByRecipe.get(recipe.id) ?? []).map((line) => ({
        id: line.id,
        ingredientId: line.ingredientId,
        childRecipeId: line.childRecipeId,
        quantity: line.quantity,
        unitId: line.unitId,
      })),
    });
  }

  const ingredientMap = new Map<string, IngredientCostInput>();
  for (const ingredient of ingredients) {
    ingredientMap.set(ingredient.id, {
      id: ingredient.id,
      name: ingredient.name,
      purchaseUnitId: ingredient.purchaseUnitId,
      purchaseQuantity: ingredient.purchaseQuantity,
      recipeUnitId: ingredient.recipeUnitId,
      yieldPercent: ingredient.yieldPercent,
      priceCents: latestPrices.get(ingredient.id) ?? null,
    });
  }

  return { recipes: recipeMap, ingredients: ingredientMap, conversions };
}

export async function costRecipeById(recipeId: string): Promise<RecipeCost> {
  const ctx = await buildRecipeContext();
  return costRecipePure(recipeId, ctx);
}

/**
 * INV-2, "detect on write": check whether adding a line from `recipeId` to
 * `proposedChildRecipeId` would create a cycle, without actually writing
 * it. Used by the recipe-line create/update server action before it ever
 * reaches the database (the SQLite triggers only enforce the ingredient/
 * child-recipe XOR, not cycle-freedom — that is a whole-graph property no
 * single-row CHECK constraint can express).
 */
export async function wouldCreateCycle(
  recipeId: string,
  proposedChildRecipeId: string,
): Promise<string[] | null> {
  const ctx = await buildRecipeContext();
  const recipe = ctx.recipes.get(recipeId);
  if (!recipe) {
    throw new Error(`recipe not found: "${recipeId}"`);
  }
  const hypothetical: RecipeInput = {
    ...recipe,
    lines: [
      ...recipe.lines,
      {
        id: "__proposed__",
        ingredientId: null,
        childRecipeId: proposedChildRecipeId,
        quantity: 1,
        unitId: recipe.yieldUnitId,
      },
    ],
  };
  const hypotheticalRecipes = new Map(ctx.recipes);
  hypotheticalRecipes.set(recipeId, hypothetical);
  const cycle = detectCyclePure(recipeId, { ...ctx, recipes: hypotheticalRecipes });
  return cycle ? cycle.map((id) => hypotheticalRecipes.get(id)?.name ?? id) : null;
}

function resolveTreeFromContext(recipeId: string, ctx: RecipeContext): ResolvedRecipe {
  const recipe = ctx.recipes.get(recipeId);
  if (!recipe) {
    throw new Error(`recipe not found: "${recipeId}"`);
  }
  return {
    id: recipe.id,
    name: recipe.name,
    standardYieldQty: recipe.standardYieldQty,
    yieldUnitId: recipe.yieldUnitId,
    lines: recipe.lines.map((line) => {
      if (line.ingredientId) {
        const ingredient = ctx.ingredients.get(line.ingredientId);
        if (!ingredient) {
          throw new Error(`ingredient not found: "${line.ingredientId}"`);
        }
        return {
          quantity: line.quantity,
          unitId: line.unitId,
          ingredient: {
            id: ingredient.id,
            name: ingredient.name,
            recipeUnitId: ingredient.recipeUnitId,
          },
        };
      }
      if (line.childRecipeId) {
        return {
          quantity: line.quantity,
          unitId: line.unitId,
          childRecipe: resolveTreeFromContext(line.childRecipeId, ctx),
        };
      }
      throw new Error(`recipe line "${line.id}" has neither an ingredient nor a child recipe`);
    }),
  };
}

export async function resolveRecipeTree(recipeId: string): Promise<ResolvedRecipe> {
  const ctx = await buildRecipeContext();
  const cycle = detectCyclePure(recipeId, ctx);
  if (cycle) {
    throw new CircularRecipeError(cycle.map((id) => ctx.recipes.get(id)?.name ?? id));
  }
  return resolveTreeFromContext(recipeId, ctx);
}

export async function scaleRecipeById(
  recipeId: string,
  desiredYield: number,
): Promise<ScaledLine[]> {
  const [tree, conversions] = await Promise.all([
    resolveRecipeTree(recipeId),
    loadConversionTable(),
  ]);
  return scaleRecipePure(tree, desiredYield, conversions);
}

export async function purchaseListForBatch(
  recipeId: string,
  desiredYield: number,
): Promise<PurchaseLine[]> {
  const [scaled, conversions, ingredients] = await Promise.all([
    scaleRecipeById(recipeId, desiredYield),
    loadConversionTable(),
    prisma.ingredient.findMany(),
  ]);
  const refs: IngredientRef[] = ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    purchaseUnitId: ingredient.purchaseUnitId,
    purchaseQuantity: ingredient.purchaseQuantity,
    recipeUnitId: ingredient.recipeUnitId,
    yieldPercent: ingredient.yieldPercent,
  }));
  return purchaseListPure(scaled, refs, conversions);
}

/** Margin percent for every active product, keyed by productId. Products
 * whose recipe can't currently be costed (INV-1/INV-2) are simply omitted
 * — never given a fabricated 0% margin. */
export async function computeAllActiveProductMargins(): Promise<Map<string, number>> {
  const products = await prisma.product.findMany({ where: { active: true } });
  const ctx = await buildRecipeContext();
  const result = new Map<string, number>();
  for (const product of products) {
    try {
      const cost = costRecipePure(product.recipeId, ctx);
      result.set(product.id, marginPercent(cost.unitCents, product.sellingPriceCents));
    } catch {
      // Uncostable right now (missing price, cycle, ...) — omit rather
      // than record a misleading margin. The recipe/ingredient page
      // surfaces the underlying error directly to the user.
    }
  }
  return result;
}

/**
 * Append a new price row (INV-3: IngredientPrice is append-only — this
 * never updates or deletes an existing row) and write a MarginAlert for
 * every active product whose margin crosses below its threshold as a
 * result — Phase 7. "Crosses below" means it was at/above the threshold
 * before this price and is below it after, matching "fell below" in the
 * spec; a product already under threshold does not get a fresh alert for
 * every subsequent price tick.
 */
export async function recordIngredientPrice(
  ingredientId: string,
  priceCents: number,
  source?: string,
): Promise<void> {
  if (priceCents < 0) {
    throw new InvalidPriceError(`price cannot be negative (got ${priceCents} cents)`);
  }

  const marginsBefore = await computeAllActiveProductMargins();
  await prisma.ingredientPrice.create({
    data: { ingredientId, priceCents, source: source ?? null },
  });
  const marginsAfter = await computeAllActiveProductMargins();

  const products = await prisma.product.findMany({ where: { active: true } });
  for (const product of products) {
    const before = marginsBefore.get(product.id);
    const after = marginsAfter.get(product.id);
    if (before === undefined || after === undefined) {
      continue;
    }
    if (before >= product.minMarginPercent && after < product.minMarginPercent) {
      await prisma.marginAlert.create({
        data: {
          productId: product.id,
          oldMargin: before,
          newMargin: after,
        },
      });
    }
  }
}
