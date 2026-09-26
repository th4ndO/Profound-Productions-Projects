import type { MatchKind, SearchHit, Unit } from '../model/types';

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en-ZA')} ${n === 1 ? one : many}`;
}

/** "a, b and c" */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export const KIND_LABEL: Record<MatchKind, { badge: string; one: string; many: string }> = {
  exact: { badge: 'Exact', one: 'exact', many: 'exact' },
  variant: { badge: 'Name variant', one: 'name variant', many: 'name variants' },
  fuzzy: { badge: 'Possible typo', one: 'possible typo', many: 'possible typos' },
};

export interface Summary {
  headline: string;
  breakdown: string;
}

/**
 * "Found 14 entries matching “Sarah Connor” across 3 pages and 2 sheets in
 * 2 files" plus "12 exact, 2 possible typos". Units are counted per file
 * type (pages, sheets, sections…) as distinct groups.
 */
export function summarize(hits: SearchHit[], units: Map<string, Unit>, query: string): Summary {
  const groups = new Map<string, { unit: Unit; keys: Set<string> }>();
  const files = new Set<string>();
  const kinds: Record<MatchKind, number> = { exact: 0, variant: 0, fuzzy: 0 };
  for (const h of hits) {
    const unit = units.get(h.record.fileId) ?? { one: 'section', many: 'sections' };
    let g = groups.get(unit.many);
    if (!g) groups.set(unit.many, (g = { unit, keys: new Set() }));
    g.keys.add(`${h.record.fileId}\u0000${h.record.group}`);
    files.add(h.record.fileId);
    kinds[h.best]++;
  }
  const across = [...groups.values()].map((g) => plural(g.keys.size, g.unit.one, g.unit.many));
  const headline =
    `Found ${plural(hits.length, 'entry', 'entries')} matching “${query.trim()}”` +
    (across.length ? ` across ${listJoin(across)}` : '') +
    ` in ${plural(files.size, 'file', 'files')}`;
  const parts = (['exact', 'variant', 'fuzzy'] as const).filter((k) => kinds[k] > 0).map((k) => plural(kinds[k], KIND_LABEL[k].one, KIND_LABEL[k].many));
  return { headline, breakdown: parts.join(', ') };
}

/** Snippet around the first span, cut at word boundaries. Offsets are into `text`. */
export function snippetRange(text: string, spanStart: number, spanEnd: number, radius = 110): { start: number; end: number } {
  if (text.length <= radius * 2 + (spanEnd - spanStart)) return { start: 0, end: text.length };
  let start = Math.max(0, spanStart - radius);
  let end = Math.min(text.length, spanEnd + radius);
  if (start > 0) {
    const ws = text.slice(start, spanStart).search(/\s/);
    if (ws >= 0 && start + ws < spanStart) start = start + ws + 1;
  }
  if (end < text.length) {
    const tail = text.slice(spanEnd, end);
    const ws = tail.search(/\s\S*$/);
    if (ws > 0) end = spanEnd + ws;
  }
  return { start, end };
}
