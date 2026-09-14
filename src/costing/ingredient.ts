/**
 * Ingredient cost chain: purchase price -> as-purchased (AP) unit cost ->
 * recipe-unit AP cost -> edible-portion (EP) unit cost.
 *
 * "AP" (as purchased) is the cost of the raw ingredient as bought. "EP"
 * (edible portion) corrects AP for unavoidable waste (trim, peel,
 * evaporation, ...) captured by `yieldPercent`, so EP is always >= AP.
 * These intermediate figures are kept as full-precision fractional cents —
 * only a final total gets rounded (see `roundHalfUpCents` in ./types.ts).
 */
import { InvalidPriceError, InvalidYieldError } from "./errors";

/**
 * Cost of ONE purchase unit (e.g. cents per kg), given the price paid for a
 * whole pack and how many purchase units that pack contains.
 */
export function purchaseUnitCostCents(
  priceCents: number,
  purchaseQuantity: number,
): number {
  if (priceCents < 0) {
    throw new InvalidPriceError(
      `price cannot be negative (got ${priceCents} cents)`,
    );
  }
  if (purchaseQuantity <= 0) {
    throw new InvalidPriceError(
      `purchase quantity must be greater than zero (got ${purchaseQuantity})`,
    );
  }
  return priceCents / purchaseQuantity;
}

/**
 * Re-express a purchase-unit cost as a cost per recipe unit, given the
 * conversion factor from the purchase unit to the recipe unit (i.e.
 * `convert(1, purchaseUnitId, recipeUnitId, table)`, UT-01: kg -> g is
 * 1000). Cost per unit is inversely proportional to how many of that unit
 * one purchase unit contains, so this divides rather than multiplies.
 */
export function recipeUnitCostCents(
  purchaseUnitCostCentsValue: number,
  factor: number,
): number {
  if (factor <= 0) {
    throw new InvalidPriceError(
      `conversion factor must be greater than zero (got ${factor})`,
    );
  }
  return purchaseUnitCostCentsValue / factor;
}

/**
 * Correct an as-purchased unit cost for yield loss: EP = AP / (yield% / 100).
 * 100% yield is the common case and is returned unchanged rather than
 * risking a rounding artefact from dividing by 1.
 */
export function edibleUnitCostCents(
  apUnitCostCents: number,
  yieldPercent: number,
): number {
  if (yieldPercent <= 0 || yieldPercent > 100) {
    throw new InvalidYieldError(
      `yield percent must be greater than 0 and at most 100 (got ${yieldPercent})`,
    );
  }
  if (yieldPercent === 100) {
    return apUnitCostCents;
  }
  return apUnitCostCents / (yieldPercent / 100);
}
