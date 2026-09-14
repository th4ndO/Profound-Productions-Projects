/**
 * Recipe costing: recursive roll-up of ingredient and sub-recipe lines into
 * a total, a per-unit cost, and an incidentals allowance.
 *
 * INV-2 (circular recipes are detected, never traversed): `costRecipe`
 * always runs `detectCycle` first and throws CircularRecipeError rather
 * than recursing into a cycle. `detectCycle` itself is safe to call on any
 * graph, cyclic or not — it uses an explicit "currently on the DFS stack"
 * set instead of unbounded recursion, so a cycle is *found*, never
 * *stack-overflowed*.
 */
import { CircularRecipeError, CostingError, MissingPriceError } from "./errors";
import { edibleUnitCostCents, purchaseUnitCostCents, recipeUnitCostCents } from "./ingredient";
import { convert } from "./units";
import { roundHalfUpCents } from "./types";
import type { RecipeContext, RecipeCost, RecipeCostLine } from "./types";

/**
 * Depth-first search for a cycle reachable from `recipeId` through
 * childRecipeId links. Returns the cycle as an ordered list of recipe ids
 * (first id repeated at the end, e.g. `["a", "b", "a"]`) or `null` if the
 * recipe graph reachable from here is acyclic.
 *
 * Uses a "currently visiting" set scoped to the current DFS path (not "ever
 * visited"), so diamond-shaped reuse of the same sub-recipe in two
 * different branches is not mistaken for a cycle.
 */
export function detectCycle(recipeId: string, ctx: RecipeContext): string[] | null {
  const path: string[] = [];
  const onPath = new Set<string>();

  function visit(id: string): string[] | null {
    if (onPath.has(id)) {
      const startIndex = path.indexOf(id);
      return [...path.slice(startIndex), id];
    }
    const recipe = ctx.recipes.get(id);
    if (!recipe) {
      // An unresolvable reference is not this function's concern — costRecipe
      // will raise its own error when it tries to cost the missing recipe.
      return null;
    }

    onPath.add(id);
    path.push(id);

    for (const line of recipe.lines) {
      if (line.childRecipeId) {
        const cycle = visit(line.childRecipeId);
        if (cycle) {
          return cycle;
        }
      }
    }

    onPath.delete(id);
    path.pop();
    return null;
  }

  return visit(recipeId);
}

/** Apply an incidentals allowance (packaging, consumables, ...) to a cost,
 * rounding half-up to the nearest cent. `incidentalsRate` is 0-100. */
export function applyIncidentals(costCents: number, incidentalsRate: number): number {
  return roundHalfUpCents(costCents * (1 + incidentalsRate / 100));
}

/**
 * Cost a recipe recursively: every ingredient line resolves through the
 * AP -> EP chain in ./ingredient.ts, every sub-recipe line costs the child
 * recipe first and charges this line `(quantity / childStandardYield) *
 * childTotalCost`. Detects cycles before doing any recursion (INV-2) and
 * throws MissingPriceError the moment an ingredient with no recorded price
 * is encountered, anywhere in the tree (INV-1) — it never substitutes a
 * zero and keeps going.
 */
export function costRecipe(recipeId: string, ctx: RecipeContext): RecipeCost {
  const cycle = detectCycle(recipeId, ctx);
  if (cycle) {
    const named = cycle.map((id) => ctx.recipes.get(id)?.name ?? id);
    throw new CircularRecipeError(named);
  }
  return costRecipeUnchecked(recipeId, ctx);
}

/**
 * Same as `costRecipe` but skips the cycle check — only safe to call once a
 * caller has already established the reachable graph is acyclic (which
 * `costRecipe` does before its first call). Not exported: every external
 * entry point must go through the checked version.
 */
function costRecipeUnchecked(recipeId: string, ctx: RecipeContext): RecipeCost {
  const recipe = ctx.recipes.get(recipeId);
  if (!recipe) {
    throw new CostingError(`recipe not found: "${recipeId}"`);
  }

  const lines: RecipeCostLine[] = [];
  let subtotalCents = 0; // full precision; rounded only at the totals below

  for (const line of recipe.lines) {
    if (line.ingredientId) {
      const ingredient = ctx.ingredients.get(line.ingredientId);
      if (!ingredient) {
        throw new CostingError(`ingredient not found: "${line.ingredientId}"`);
      }
      if (ingredient.priceCents === null) {
        throw new MissingPriceError(
          `no price recorded for ingredient "${ingredient.name}"`,
        );
      }

      const apUnitCostCents = purchaseUnitCostCents(
        ingredient.priceCents,
        ingredient.purchaseQuantity,
      );
      const purchaseToRecipeFactor = convert(
        1,
        ingredient.purchaseUnitId,
        ingredient.recipeUnitId,
        ctx.conversions,
      );
      const apRecipeUnitCostCents = recipeUnitCostCents(
        apUnitCostCents,
        purchaseToRecipeFactor,
      );
      const epRecipeUnitCostCents = edibleUnitCostCents(
        apRecipeUnitCostCents,
        ingredient.yieldPercent,
      );

      const quantityInRecipeUnit = convert(
        line.quantity,
        line.unitId,
        ingredient.recipeUnitId,
        ctx.conversions,
      );
      const lineCostFull = epRecipeUnitCostCents * quantityInRecipeUnit;
      const lineCostCents = roundHalfUpCents(lineCostFull);
      subtotalCents += lineCostFull;

      lines.push({
        lineId: line.id,
        kind: "ingredient",
        refId: ingredient.id,
        name: ingredient.name,
        quantity: line.quantity,
        unitId: line.unitId,
        lineCostCents,
      });
    } else if (line.childRecipeId) {
      const childRecipe = ctx.recipes.get(line.childRecipeId);
      if (!childRecipe) {
        throw new CostingError(`recipe not found: "${line.childRecipeId}"`);
      }
      const childCost = costRecipeUnchecked(line.childRecipeId, ctx);

      const quantityInChildYieldUnit = convert(
        line.quantity,
        line.unitId,
        childRecipe.yieldUnitId,
        ctx.conversions,
      );
      const ratio = quantityInChildYieldUnit / childRecipe.standardYieldQty;
      const lineCostFull = ratio * childCost.totalCents;
      const lineCostCents = roundHalfUpCents(lineCostFull);
      subtotalCents += lineCostFull;

      lines.push({
        lineId: line.id,
        kind: "subrecipe",
        refId: childRecipe.id,
        name: childRecipe.name,
        quantity: line.quantity,
        unitId: line.unitId,
        lineCostCents,
      });
    } else {
      throw new CostingError(
        `recipe line "${line.id}" has neither an ingredient nor a child recipe`,
      );
    }
  }

  const totalCents = roundHalfUpCents(subtotalCents);
  const appliedIncidentalsCents = roundHalfUpCents(
    subtotalCents * (recipe.incidentalsRate / 100),
  );
  const unitCents = roundHalfUpCents(
    (subtotalCents / recipe.standardYieldQty) * (1 + recipe.incidentalsRate / 100),
  );

  return {
    recipeId: recipe.id,
    totalCents,
    unitCents,
    appliedIncidentalsCents,
    lines,
  };
}
