/**
 * Public surface of the costing module. Pure TypeScript — no Prisma import,
 * no React import, no `fetch`, anywhere under src/costing/. See the BUILD
 * SPEC §6 for the contract this module implements and §3 for the
 * behavioural invariants (INV-1..INV-3) it exists to guarantee.
 */

export * from "./errors";
export * from "./types";
export { convert } from "./units";
export {
  edibleUnitCostCents,
  purchaseUnitCostCents,
  recipeUnitCostCents,
} from "./ingredient";
export { applyIncidentals, costRecipe, detectCycle } from "./recipe";
export { foodCostPercent, marginPercent, suggestedPriceCents } from "./margin";
export { purchaseList, scaleRecipe, scalingFactor } from "./batch";
