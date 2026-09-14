/**
 * Shared type contracts for the costing module.
 *
 * Conventions (see BUILD SPEC §4):
 *  - Every monetary amount that is *stored or displayed* is an integer
 *    number of cents. Intermediate per-unit costs (e.g. cents per gram) are
 *    kept as full-precision floats and only rounded, half-up, at the point
 *    a total is produced for persistence or display — see `roundHalfUpCents`.
 *  - Percentages (yield, incidentals, margin, food cost) are numbers in the
 *    range 0-100, never 0-1.
 *  - Quantities and unit-conversion factors are floats.
 *
 * This file has no Prisma import, no React import, and no `fetch` — nothing
 * in `src/costing/` does. The application layer (src/lib/, src/app/) maps
 * Prisma rows onto these shapes; the costing module never reads a database
 * or a request itself, which is what keeps its unit tests meaningful and
 * the module portable to a different stack.
 */

/** Round-half-up to the nearest whole cent. Money is never left fractional
 * once it is going into a total, a line cost, or a database column. */
export function roundHalfUpCents(value: number): number {
  return Math.floor(value + 0.5);
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

/** One directed conversion: `quantity_in_to = quantity_in_from * factor`. */
export interface UnitConversionRow {
  fromUnitId: string;
  toUnitId: string;
  factor: number;
}

export type ConversionTable = UnitConversionRow[];

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

/**
 * The data `costRecipe` needs about one ingredient. `priceCents` is the
 * *current* price (the IngredientPrice row with the latest effectiveFrom)
 * resolved by the caller — `null` when no price row exists at all, which is
 * what triggers INV-1's MissingPriceError.
 */
export interface IngredientCostInput {
  id: string;
  name: string;
  purchaseUnitId: string;
  purchaseQuantity: number;
  recipeUnitId: string;
  yieldPercent: number;
  priceCents: number | null;
}

/** The subset of ingredient fields `batch.ts` needs to build a purchase list. */
export interface IngredientRef {
  id: string;
  name: string;
  purchaseUnitId: string;
  purchaseQuantity: number;
  recipeUnitId: string;
  yieldPercent: number;
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/** A single ingredient or sub-recipe line. Exactly one of ingredientId /
 * childRecipeId is set — the same XOR the database enforces (see the
 * `recipe_line_xor_check` migration). */
export interface RecipeLineInput {
  id: string;
  ingredientId: string | null;
  childRecipeId: string | null;
  quantity: number;
  unitId: string;
}

export interface RecipeInput {
  id: string;
  name: string;
  standardYieldQty: number;
  yieldUnitId: string;
  incidentalsRate: number;
  lines: RecipeLineInput[];
}

/**
 * Everything `costRecipe`/`detectCycle` need, indexed for O(1) lookup.
 * Built by the application layer from however many Prisma queries it takes;
 * the costing module only ever sees these plain maps/arrays.
 */
export interface RecipeContext {
  recipes: Map<string, RecipeInput>;
  ingredients: Map<string, IngredientCostInput>;
  conversions: ConversionTable;
}

export type RecipeCostLineKind = "ingredient" | "subrecipe";

export interface RecipeCostLine {
  lineId: string;
  kind: RecipeCostLineKind;
  refId: string; // ingredientId or childRecipeId
  name: string;
  quantity: number;
  unitId: string;
  lineCostCents: number;
}

export interface RecipeCost {
  recipeId: string;
  /** Sum of every line's cost, rounded half-up to the nearest cent. Does
   * NOT include incidentals — see `appliedIncidentalsCents`. */
  totalCents: number;
  /** Cost per standard-yield unit, incidentals included. */
  unitCents: number;
  /** Incidentals allowance applied over the whole standard batch. */
  appliedIncidentalsCents: number;
  lines: RecipeCostLine[];
}

// ---------------------------------------------------------------------------
// Batch scaling
// ---------------------------------------------------------------------------

/** A recipe with every sub-recipe line already resolved inline, so
 * `scaleRecipe` can walk it without a lookup table. */
export interface ResolvedRecipeLine {
  quantity: number;
  unitId: string;
  ingredient?: {
    id: string;
    name: string;
    recipeUnitId: string;
  };
  childRecipe?: ResolvedRecipe;
}

export interface ResolvedRecipe {
  id: string;
  name: string;
  standardYieldQty: number;
  yieldUnitId: string;
  lines: ResolvedRecipeLine[];
}

/** A raw-ingredient requirement after scaling and flattening every
 * sub-recipe down to its leaves. `quantity` is expressed in the
 * ingredient's own recipe unit. Same ingredient may appear from more than
 * one line/sub-recipe — `purchaseList` aggregates those. */
export interface ScaledLine {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitId: string;
}

export interface PurchaseLine {
  ingredientId: string;
  ingredientName: string;
  /** As-purchased quantity required, expressed in the ingredient's
   * purchase unit (after correcting for yield loss). */
  requiredApQuantity: number;
  purchaseUnitId: string;
  /** Always rounded UP to a whole number of packs — see UT-20. */
  packsToBuy: number;
}
