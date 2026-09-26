/** Strip accents (José → Jose) and unify apostrophes. Case is kept. */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}+/gu, '').replace(/[’‘]/g, "'");
}

/** Accent- and case-insensitive form used for comparisons and the index. */
export function fold(s: string): string {
  return stripAccents(s).toLowerCase();
}

/**
 * Optimal string alignment distance (Levenshtein plus adjacent transposition),
 * stopping early once the result must exceed `max`. Returns max + 1 in that case.
 */
export function osaDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev2 = new Array<number>(lb + 1).fill(0);
  let prev = new Array<number>(lb + 1);
  let cur = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cb = b.charCodeAt(j - 1);
      const cost = ca === cb ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && ca === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === cb) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[lb];
}

/** Typo budget for one part of a multi-word name. */
export function partBudget(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

/** Stricter typo budget when the whole query is a single word. */
export function singleWordBudget(len: number): number {
  if (len <= 4) return 0;
  if (len <= 7) return 1;
  return 2;
}
