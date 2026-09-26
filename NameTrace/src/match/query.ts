import { tokenize } from './tokenize';

export interface QueryPart {
  fold: string;
  cased: string;
  /** The query itself used an initial for this part ("S. Connor"). */
  isInitial: boolean;
}

export interface ParsedQuery {
  /** Parts in "First … Last" order. The last one is treated as the surname. */
  parts: QueryPart[];
  /** Human-readable, reordered form, e.g. "Sarah Connor" for "Connor, Sarah". */
  display: string;
}

/**
 * Split a smart-mode query into name parts. "Last, First Middle" is reordered
 * to "First Middle Last".
 */
export function parseQuery(raw: string): ParsedQuery | null {
  const q = raw.trim().replace(/\s+/g, ' ');
  if (!q) return null;
  let ordered = q;
  const comma = q.indexOf(',');
  if (comma > 0) {
    const last = q.slice(0, comma).trim();
    const rest = q.slice(comma + 1).replace(/,/g, ' ').trim();
    ordered = rest ? `${rest} ${last}` : last;
  }
  const parts = tokenize(ordered).map((t) => ({
    fold: t.fold,
    cased: t.cased,
    isInitial: t.isInitial || [...t.fold].length === 1,
  }));
  if (parts.length === 0) return null;
  return { parts, display: ordered };
}
