/**
 * Typed error hierarchy for the costing module.
 *
 * INV-1 (never return a zero cost) and INV-2 (circular recipes are detected,
 * never traversed) are both enforced by *throwing* one of these instead of
 * returning 0, null, or a partial total. Callers (API routes, server
 * actions, UI) must let a CostingError surface as a clear message — never
 * catch one here and substitute a default value.
 *
 * Every message names the offending entity (an ingredient's name, a unit id,
 * a recipe's cycle path) so the error is actionable without a debugger.
 */

/** Base class for every error raised by the costing module. */
export class CostingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Keeps `instanceof` working correctly for subclasses regardless of the
    // target JS runtime's handling of built-in Error subclassing.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** INV-1: an ingredient has no IngredientPrice row to cost against. */
export class MissingPriceError extends CostingError {}

/** INV-1: no direct or inverse UnitConversion links two units. */
export class MissingConversionError extends CostingError {}

/**
 * INV-2: a recipe references itself directly or through a chain of
 * sub-recipes. `cyclePath` lists the recipe names/ids in traversal order,
 * starting and ending on the same recipe, e.g. `["A", "B", "A"]`.
 */
export class CircularRecipeError extends CostingError {
  constructor(public readonly cyclePath: string[]) {
    super(`circular recipe reference detected: ${cyclePath.join(" -> ")}`);
    this.name = "CircularRecipeError";
  }
}

/** A yield percent is <= 0 or > 100. */
export class InvalidYieldError extends CostingError {}

/** A price or purchase quantity is negative, zero, or otherwise unusable. */
export class InvalidPriceError extends CostingError {}
