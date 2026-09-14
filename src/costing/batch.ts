/**
 * Batch scaling: turn a recipe's standard quantities into the quantities
 * needed for one planned batch, then aggregate those into a purchase list
 * expressed in purchasable packs.
 *
 * Scaling walks a `ResolvedRecipe` — a recipe tree with every sub-recipe
 * line already resolved inline by the caller — so this module never needs
 * a lookup table to find a child recipe (it only needs the unit conversion
 * table, to move between a line's own unit and the unit its target is
 * denominated in).
 */
import { InvalidYieldError } from "./errors";
import { convert } from "./units";
import type {
  ConversionTable,
  IngredientRef,
  PurchaseLine,
  ResolvedRecipe,
  ScaledLine,
} from "./types";

/** How many "standard batches" a desired yield represents. */
export function scalingFactor(desiredYield: number, standardYield: number): number {
  if (standardYield <= 0) {
    throw new InvalidYieldError(
      `standard yield must be greater than zero (got ${standardYield})`,
    );
  }
  if (desiredYield <= 0) {
    throw new InvalidYieldError(
      `desired yield must be greater than zero (got ${desiredYield})`,
    );
  }
  return desiredYield / standardYield;
}

/**
 * Scale a resolved recipe to `desiredYield` and flatten it down to raw
 * ingredient requirements, recursing through every sub-recipe line. The
 * same ingredient can appear more than once (from different lines, or from
 * more than one sub-recipe) — callers combine those with `purchaseList`.
 */
export function scaleRecipe(
  recipe: ResolvedRecipe,
  desiredYield: number,
  conversions: ConversionTable,
): ScaledLine[] {
  const factor = scalingFactor(desiredYield, recipe.standardYieldQty);
  return scaleLinesAtFactor(recipe, factor, conversions);
}

function scaleLinesAtFactor(
  recipe: ResolvedRecipe,
  factor: number,
  conversions: ConversionTable,
): ScaledLine[] {
  const result: ScaledLine[] = [];

  for (const line of recipe.lines) {
    const scaledQuantity = line.quantity * factor;

    if (line.ingredient) {
      const quantityInRecipeUnit = convert(
        scaledQuantity,
        line.unitId,
        line.ingredient.recipeUnitId,
        conversions,
      );
      result.push({
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        quantity: quantityInRecipeUnit,
        unitId: line.ingredient.recipeUnitId,
      });
    } else if (line.childRecipe) {
      const quantityInChildYieldUnit = convert(
        scaledQuantity,
        line.unitId,
        line.childRecipe.yieldUnitId,
        conversions,
      );
      const childFactor = quantityInChildYieldUnit / line.childRecipe.standardYieldQty;
      result.push(...scaleLinesAtFactor(line.childRecipe, childFactor, conversions));
    } else {
      throw new InvalidYieldError(
        `recipe line in "${recipe.name}" has neither an ingredient nor a child recipe`,
      );
    }
  }

  return result;
}

/**
 * Aggregate scaled (edible-portion) ingredient requirements across every
 * line and sub-recipe into a shopping list of whole packs to buy.
 *
 * requiredAP = recipeQty / (yieldPercent / 100)   -- corrects for waste
 * packsToBuy = ceil(requiredAP_in_purchase_units / purchaseQuantity)
 *
 * `packsToBuy` always rounds UP — a fraction of a pack still has to be
 * bought whole (UT-20).
 */
export function purchaseList(
  scaled: ScaledLine[],
  ingredients: IngredientRef[],
  conversions: ConversionTable,
): PurchaseLine[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const epQuantityByIngredient = new Map<string, number>();

  for (const line of scaled) {
    epQuantityByIngredient.set(
      line.ingredientId,
      (epQuantityByIngredient.get(line.ingredientId) ?? 0) + line.quantity,
    );
  }

  const result: PurchaseLine[] = [];
  for (const [ingredientId, epQuantityInRecipeUnit] of epQuantityByIngredient) {
    const ingredient = byId.get(ingredientId);
    if (!ingredient) {
      throw new InvalidYieldError(
        `ingredient not found while building purchase list: "${ingredientId}"`,
      );
    }
    if (ingredient.yieldPercent <= 0 || ingredient.yieldPercent > 100) {
      throw new InvalidYieldError(
        `yield percent must be greater than 0 and at most 100 for ingredient "${ingredient.name}" (got ${ingredient.yieldPercent})`,
      );
    }

    const requiredApInRecipeUnit = epQuantityInRecipeUnit / (ingredient.yieldPercent / 100);
    const requiredApInPurchaseUnit = convert(
      requiredApInRecipeUnit,
      ingredient.recipeUnitId,
      ingredient.purchaseUnitId,
      conversions,
    );
    const packsToBuy = Math.ceil(requiredApInPurchaseUnit / ingredient.purchaseQuantity);

    result.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      requiredApQuantity: requiredApInPurchaseUnit,
      purchaseUnitId: ingredient.purchaseUnitId,
      packsToBuy,
    });
  }

  return result;
}
