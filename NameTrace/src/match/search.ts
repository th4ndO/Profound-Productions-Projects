import { fieldRanges } from '../model/fields';
import { KIND_RANK, type MatchKind, type MatchSpan, type NormRecord, type SearchHit, type SearchOptions } from '../model/types';
import { buildExactRegex, exactMatch } from './exact';
import { osaDistance } from './normalize';
import { parseQuery, type QueryPart } from './query';
import { DEFAULT_FUZZY_POLICY, fuzzyBudget, smartMatch, type FuzzyPolicy } from './smart';
import { MapIndex, type TokenIndex } from './tokenIndex';
import { tokenize, tokensFor } from './tokenize';

export type { TokenIndex } from './tokenIndex';

export function buildIndex(records: NormRecord[]): MapIndex {
  const index = new Map<string, number[]>();
  for (let r = 0; r < records.length; r++) {
    for (const t of tokensFor(records[r])) {
      let list = index.get(t.fold);
      if (!list) index.set(t.fold, (list = []));
      if (list[list.length - 1] !== r) list.push(r);
    }
  }
  return new MapIndex(index);
}

export interface SearchableFile {
  records: NormRecord[];
  index: TokenIndex;
}

function firstChar(s: string): string {
  return s.length ? String.fromCodePoint(s.codePointAt(0)!) : '';
}

/**
 * Index keys that could satisfy one name part: a superset of what the span
 * matcher will accept for that slot (exact, fuzzy within budget, or initial).
 */
function partKeys(index: TokenIndex, part: QueryPart, isSurname: boolean, single: boolean, policy: FuzzyPolicy): string[] {
  const f = firstChar(part.fold);
  if (part.isInitial) {
    if (single) return index.has(part.fold) ? [part.fold] : [];
    return index.keyList.filter((k) => firstChar(k) === f);
  }
  const keys = index.has(part.fold) ? [part.fold] : [];
  if (!isSurname && !single && f !== part.fold && index.has(f)) keys.push(f); // "S." for "Sarah"
  const len = [...part.fold].length;
  const budget = fuzzyBudget(len, single, policy);
  if (budget === 0) return keys;
  for (const k of index.keyList) {
    if (k === part.fold) continue;
    if (Math.abs(k.length - part.fold.length) > budget) continue;
    if (policy === 'strict' && firstChar(k) !== f) continue;
    if (osaDistance(k, part.fold, budget) <= budget) keys.push(k);
  }
  return keys;
}

function union(index: TokenIndex, keys: string[]): number[] {
  if (keys.length === 1) return Array.from(index.get(keys[0]) ?? []);
  const set = new Set<number>();
  for (const k of keys) {
    const list = index.get(k);
    if (list) for (let i = 0; i < list.length; i++) set.add(list[i]);
  }
  return [...set];
}

/**
 * Records that contain a candidate token for every part of the name. Parts
 * typed as a single letter expand to many keys, so they are only used to
 * narrow further when the other parts leave a large candidate set.
 */
function candidateRecords(index: TokenIndex, parts: QueryPart[], policy: FuzzyPolicy): number[] {
  const single = parts.length === 1;
  let sIdx = parts.length - 1;
  while (sIdx > 0 && parts[sIdx].bracketed) sIdx--;
  // Bracketed parts are optional, so they can't be required here.
  const order = parts.map((p, i) => ({ p, surname: i === sIdx })).filter((o) => !o.p.bracketed || o.surname);
  const words = order.filter((o) => !o.p.isInitial);
  const initials = order.filter((o) => o.p.isInitial);
  const lists = words
    .map((o) => union(index, partKeys(index, o.p, o.surname, single, policy)))
    .sort((a, b) => a.length - b.length);
  let result: number[] | null = lists[0] ?? null;
  for (let i = 1; i < lists.length && result!.length; i++) {
    const other = new Set(lists[i]);
    result = result!.filter((r) => other.has(r));
  }
  for (const o of initials) {
    if (result && result.length <= NARROW_ENOUGH) break;
    const list = union(index, partKeys(index, o.p, o.surname, single, policy));
    if (!result) result = list;
    else {
      const other = new Set(list);
      result = result.filter((r) => other.has(r));
    }
  }
  return [...(result ?? [])].sort((a, b) => a - b);
}
const NARROW_ENOUGH = 3000;

/** Keep only spans inside the chosen field. Spans never cross a field boundary. */
function scoped(rec: NormRecord, spans: MatchSpan[], field: string | null | undefined): MatchSpan[] {
  if (!field) return spans;
  if (!rec.fields) return [];
  const ranges = fieldRanges(rec).filter((r) => r.key === field);
  return spans.filter((s) => ranges.some((r) => s.start >= r.start && s.end <= r.end));
}

function bestOf(kinds: MatchKind[]): MatchKind {
  return kinds.reduce((b, k) => (KIND_RANK[k] > KIND_RANK[b] ? k : b), kinds[0]);
}

export function searchFiles(
  files: SearchableFile[],
  rawQuery: string,
  opts: SearchOptions,
  policy: FuzzyPolicy = DEFAULT_FUZZY_POLICY,
): SearchHit[] {
  const hits: SearchHit[] = [];
  if (!rawQuery.trim()) return hits;

  if (opts.exactOnly) {
    const re = buildExactRegex(rawQuery, opts.caseSensitive);
    if (!re) return hits;
    // Prefilter on the longest query token; the regex decides.
    const qTokens = tokenize(rawQuery);
    const key = qTokens.sort((a, b) => b.fold.length - a.fold.length)[0]?.fold;
    for (const f of files) {
      const positions = key ? (f.index.get(key) ?? []) : f.records.map((_, i) => i);
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const rec = f.records[p];
        const spans = scoped(rec, exactMatch(rec.text, re), opts.field);
        if (spans.length) hits.push({ record: rec, spans, best: 'exact' });
      }
    }
    return hits;
  }

  const query = parseQuery(rawQuery);
  if (!query) return hits;
  for (const f of files) {
    const positions = candidateRecords(f.index, query.parts, policy);
    for (const p of positions) {
      const rec = f.records[p];
      const spans = scoped(rec, smartMatch(tokensFor(rec), query, { caseSensitive: opts.caseSensitive, policy }), opts.field);
      if (spans.length) hits.push({ record: rec, spans, best: bestOf(spans.map((s) => s.kind)) });
    }
  }
  return hits;
}
