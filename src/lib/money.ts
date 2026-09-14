/**
 * The single place currency is formatted for display. Never format a cents
 * value inline elsewhere — always call formatRand().
 *
 * Currency is South African Rand: space thousands separator, comma decimal
 * separator, e.g. `R1 234,56`.
 */
export function formatRand(cents: number): string {
  const rand = cents / 100;
  const sign = rand < 0 ? "-" : "";
  const absRand = Math.abs(rand);
  const [wholeStr, fractionStr = "00"] = absRand.toFixed(2).split(".");
  const withThousands = (wholeStr ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}R${withThousands},${fractionStr}`;
}

/** Format a plain percentage (already 0-100) to one decimal place, e.g. "46,0%". */
export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}
