import { KIND_RANK, type MatchKind, type MatchSpan } from '../model/types';
import { osaDistance, partBudget, singleWordBudget } from './normalize';
import type { ParsedQuery, QueryPart } from './query';
import { classifyGap, type Joiner, type Token } from './tokenize';

/**
 * Typo-matching policy.
 * - `strict` (default, see PLAN.md D7): a fuzzy part must keep its first
 *   letter, a part needs 8+ letters before it may carry 2 edits, and the
 *   whole name may carry at most 2 edits. This keeps "Conner" but drops
 *   real different surnames such as "Cannon".
 * - `brief`: only the per-part length budgets.
 */
export type FuzzyPolicy = 'strict' | 'brief';
export const DEFAULT_FUZZY_POLICY: FuzzyPolicy = 'strict';
const STRICT_TOTAL_EDITS = 2;

export interface SmartOptions {
  caseSensitive: boolean;
  policy?: FuzzyPolicy;
}

type SlotKind = 'exact' | 'initial' | 'fuzzy';
interface SlotResult {
  kind: SlotKind;
  edits: number;
}

function firstChar(s: string): string {
  return s.length ? String.fromCodePoint(s.codePointAt(0)!) : '';
}

/** Compare one text token with one name part. */
export function matchSlot(
  tok: Token,
  part: QueryPart,
  opts: { caseSensitive: boolean; isSurname: boolean; single: boolean; policy: FuzzyPolicy },
): SlotResult | null {
  const cs = opts.caseSensitive;
  const sameFirst = cs ? firstChar(tok.cased) === firstChar(part.cased) : firstChar(tok.fold) === firstChar(part.fold);

  if (part.isInitial) {
    if (opts.single) return tok.fold === part.fold && (!cs || tok.cased === part.cased) ? { kind: 'exact', edits: 0 } : null;
    if (!sameFirst) return null;
    return { kind: tok.isInitial ? 'exact' : 'initial', edits: 0 };
  }

  if (tok.fold === part.fold) {
    if (!cs || tok.cased === part.cased) return { kind: 'exact', edits: 0 };
    return null; // case-sensitive: a casing difference is a miss, never a typo
  }

  if (tok.isInitial) {
    if (!opts.isSurname && !opts.single && sameFirst) return { kind: 'initial', edits: 0 };
    return null;
  }

  const len = [...part.fold].length;
  const budget = fuzzyBudget(len, opts.single, opts.policy);
  if (budget === 0) return null;
  if (opts.policy === 'strict' && firstChar(tok.fold) !== firstChar(part.fold)) return null;
  const d = osaDistance(tok.fold, part.fold, budget);
  if (d === 0 || d > budget) return null;
  if (cs && osaDistance(tok.cased, part.cased, budget + 1) !== d) return null;
  return { kind: 'fuzzy', edits: d };
}

/** Typo budget for one name part under the given policy. */
export function fuzzyBudget(len: number, single: boolean, policy: FuzzyPolicy): number {
  const b = single ? singleWordBudget(len) : partBudget(len);
  if (policy === 'strict' && b === 2 && len < 8) return 1;
  return b;
}

interface Candidate extends MatchSpan {
  len: number;
}

const FORWARD_JOINS: ReadonlySet<Joiner> = new Set(['space', 'initial-dot', 'handle']);
const REVERSED_FIRST_JOINS: ReadonlySet<Joiner> = new Set(['space', 'comma']);

function isWordToken(t: Token): boolean {
  return /^\p{L}/u.test(t.fold);
}

/**
 * Try to match `parts` starting at token `i`, allowing one extra token
 * (a middle name or initial) before any part after the first.
 */
function walk(
  tokens: Token[],
  i: number,
  parts: QueryPart[],
  surnameIndex: number,
  allowExtra: boolean,
  firstJoins: ReadonlySet<Joiner> | null,
  opts: SmartOptions & { policy: FuzzyPolicy },
): { endTok: number; slots: SlotResult[]; usedExtra: boolean; handle: boolean } | null {
  const slots: SlotResult[] = [];
  let j = i;
  let usedExtra = false;
  let handle = false;
  for (let k = 0; k < parts.length; k++) {
    if (j >= tokens.length) return null;
    if (k > 0) {
      const joins = k === 1 && firstJoins ? firstJoins : FORWARD_JOINS;
      const g = classifyGap(tokens[j].gapBefore, tokens[j - 1]);
      if (!joins.has(g)) return null;
      if (g === 'handle') handle = true;
    }
    const slotOpts = { caseSensitive: opts.caseSensitive, isSurname: k === surnameIndex, single: false, policy: opts.policy };
    let r = matchSlot(tokens[j], parts[k], slotOpts);
    if (!r && k > 0 && allowExtra && !usedExtra && isWordToken(tokens[j]) && j + 1 < tokens.length) {
      const g = classifyGap(tokens[j + 1].gapBefore, tokens[j]);
      if (FORWARD_JOINS.has(g)) {
        const r2 = matchSlot(tokens[j + 1], parts[k], slotOpts);
        if (r2) {
          usedExtra = true;
          if (g === 'handle') handle = true;
          j += 1;
          r = r2;
        }
      }
    }
    if (!r) return null;
    slots.push(r);
    j += 1;
  }
  return { endTok: j - 1, slots, usedExtra, handle };
}

function kindOf(slots: SlotResult[], structural: boolean): MatchKind {
  if (slots.some((s) => s.kind === 'fuzzy')) return 'fuzzy';
  if (structural || slots.some((s) => s.kind === 'initial')) return 'variant';
  return 'exact';
}

function withinTotal(slots: SlotResult[], policy: FuzzyPolicy): boolean {
  if (policy !== 'strict') return true;
  return slots.reduce((n, s) => n + s.edits, 0) <= STRICT_TOTAL_EDITS;
}

/** Find all name mentions in pre-tokenised text. Spans index the original text. */
export function smartMatch(tokens: Token[], query: ParsedQuery, options: SmartOptions): MatchSpan[] {
  const opts = { ...options, policy: options.policy ?? DEFAULT_FUZZY_POLICY };
  const parts = query.parts;
  const n = parts.length;
  const found: Candidate[] = [];

  const push = (i: number, endTok: number, kind: MatchKind) => {
    const start = tokens[i].start;
    const end = tokens[endTok].baseEnd;
    found.push({ start, end, kind, len: end - start });
  };

  if (n === 1) {
    for (let i = 0; i < tokens.length; i++) {
      const r = matchSlot(tokens[i], parts[0], { caseSensitive: opts.caseSensitive, isSurname: true, single: true, policy: opts.policy });
      if (r) push(i, i, r.kind === 'fuzzy' ? 'fuzzy' : 'exact');
    }
    return resolve(found);
  }

  const reversed = [parts[n - 1], ...parts.slice(0, n - 1)];
  for (let i = 0; i < tokens.length; i++) {
    const fwd = walk(tokens, i, parts, n - 1, true, null, opts);
    if (fwd && withinTotal(fwd.slots, opts.policy)) {
      push(i, fwd.endTok, kindOf(fwd.slots, fwd.usedExtra || fwd.handle));
    }
    const rev = walk(tokens, i, reversed, 0, n > 2, REVERSED_FIRST_JOINS, opts);
    if (rev && withinTotal(rev.slots, opts.policy)) {
      push(i, rev.endTok, kindOf(rev.slots, true));
    }
  }
  return resolve(found);
}

/** Keep the best non-overlapping candidates: better kind first, then longer. */
function resolve(found: Candidate[]): MatchSpan[] {
  found.sort((a, b) => KIND_RANK[b.kind] - KIND_RANK[a.kind] || b.len - a.len || a.start - b.start);
  const kept: Candidate[] = [];
  for (const c of found) {
    if (kept.every((k) => c.end <= k.start || c.start >= k.end)) kept.push(c);
  }
  kept.sort((a, b) => a.start - b.start);
  return kept.map(({ start, end, kind }) => ({ start, end, kind }));
}
