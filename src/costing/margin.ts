/**
 * Margin and food-cost percentage calculations. Both are expressed as
 * numbers 0-100 and are complements of each other by construction:
 * marginPercent + foodCostPercent === 100 for any valid (cost, price) pair.
 */
import { InvalidPriceError } from "./errors";
import { roundHalfUpCents } from "./types";

function assertSellablePrice(priceCents: number): void {
  if (priceCents <= 0) {
    throw new InvalidPriceError(
      `selling price must be greater than zero (got ${priceCents} cents)`,
    );
  }
}

/** Gross margin as a percentage of the selling price. */
export function marginPercent(unitCostCents: number, priceCents: number): number {
  assertSellablePrice(priceCents);
  return ((priceCents - unitCostCents) / priceCents) * 100;
}

/** Cost of goods as a percentage of the selling price. */
export function foodCostPercent(unitCostCents: number, priceCents: number): number {
  assertSellablePrice(priceCents);
  return (unitCostCents / priceCents) * 100;
}

/**
 * The selling price that would put the unit cost at exactly
 * `targetFoodCostPercent` of price: price = cost / (target / 100).
 * Never divides by zero — a target of 0 (or less) throws instead.
 */
export function suggestedPriceCents(
  unitCostCents: number,
  targetFoodCostPercent: number,
): number {
  if (targetFoodCostPercent <= 0) {
    throw new InvalidPriceError(
      `target food cost percent must be greater than zero (got ${targetFoodCostPercent})`,
    );
  }
  const priceCents = roundHalfUpCents(
    unitCostCents / (targetFoodCostPercent / 100),
  );
  if (priceCents <= 0) {
    throw new InvalidPriceError(
      `computed suggested price is not a sellable amount (got ${priceCents} cents)`,
    );
  }
  return priceCents;
}
