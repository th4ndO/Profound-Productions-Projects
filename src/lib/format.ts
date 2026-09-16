/**
 * The single place money is formatted for display. Every screen that shows
 * a Rand amount must go through this — never format currency inline.
 *
 * South African convention: space as the thousands separator, comma as the
 * decimal separator, "R" prefix with no space. e.g. 123456 cents -> "R1 234,56".
 */
export function formatRand(amountCents: number): string {
  const sign = amountCents < 0 ? "-" : "";
  const absCents = Math.round(Math.abs(amountCents));
  const rands = Math.floor(absCents / 100);
  const cents = absCents % 100;

  const randsWithSeparators = rands.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const centsStr = cents.toString().padStart(2, "0");

  return `${sign}R${randsWithSeparators},${centsStr}`;
}
