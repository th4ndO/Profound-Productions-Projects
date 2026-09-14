/**
 * Unit conversion. Pure lookup over a flat table of directed factors — see
 * `ConversionTable` in ./types.ts. A `UnitConversion` row stores only one
 * direction (`fromUnitId -> toUnitId`); the inverse is derived here rather
 * than requiring both directions to be stored, so seeding "kg -> g" also
 * makes "g -> kg" resolvable.
 */
import { MissingConversionError } from "./errors";
import type { ConversionTable } from "./types";

/**
 * Convert `qty` from `fromUnitId` to `toUnitId`.
 *
 * - Same unit on both sides is the identity conversion, regardless of
 *   whether a table row exists for it.
 * - A direct row (`fromUnitId -> toUnitId`) multiplies by its factor.
 * - Its inverse (`toUnitId -> fromUnitId`) divides by that factor.
 * - No matching row in either direction throws MissingConversionError —
 *   this module never guesses a path through a third unit.
 */
export function convert(
  qty: number,
  fromUnitId: string,
  toUnitId: string,
  table: ConversionTable,
): number {
  if (fromUnitId === toUnitId) {
    return qty;
  }

  const direct = table.find(
    (row) => row.fromUnitId === fromUnitId && row.toUnitId === toUnitId,
  );
  if (direct) {
    return qty * direct.factor;
  }

  const inverse = table.find(
    (row) => row.fromUnitId === toUnitId && row.toUnitId === fromUnitId,
  );
  if (inverse) {
    return qty / inverse.factor;
  }

  throw new MissingConversionError(
    `no unit conversion from "${fromUnitId}" to "${toUnitId}"`,
  );
}
