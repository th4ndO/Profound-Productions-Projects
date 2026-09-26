import { KIND_RANK, type MatchKind, type MatchSpan } from '../model/types';
import { osaDistance, partBudget, singleWordBudget } from './normalize';
import type { ParsedQuery, QueryPart } from './query';
import { classifyGap, isBracketed, type Joiner, type Token } from './tokenize';

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
 * Is the gap before tokens[j] an allowed joiner? Brackets are allowed only
 * around a single word: "Nomsa (Mo) Dlamini".
 */
function joinOk(tokens: Token[], j: number, joins: ReadonlySet<Joiner>): { ok: boolean; handle: boolean } {
  const g = classifyGap(tokens[j].gapBefore, tokens[j - 1]);
  if (joins.has(g)) return { ok: true, handle: g === 'handle' };
  if (g === 'paren-open' && isBracketed(tokens[j])) return { ok: true, handle: false };
  if (g === 'paren-close' && isBracketed(tokens[j - 1])) return { ok: true, handle: false };
  return { ok: false, handle: false };
}

interface Walk {
  endTok: number;
  slots: SlotResult[];
  /** Anything that makes this a name variant rather than the name as typed. */
  structural: boolean;
}

/**
 * Try to match `parts` starting at token `i`, allowing one extra token
 * (a middle name, initial or bracketed nickname) before any part after the
 * first. A part the query put in brackets is optional.
 */
function walk(
  tokens: Token[],
  i: number,
  parts: QueryPart[],
  surnameIndex: number,
  allowExtra: boolean,
  firstJoins: ReadonlySet<Joiner> | null,
  opts: SmartOptions & { policy: FuzzyPolicy },
): Walk | null {
  const slots: SlotResult[] = [];
  let j = i;
  let usedExtra = false;
  let structural = false;
  for (let k = 0; k < parts.length; k++) {
    const part = parts[k];
    const optional = part.bracketed && k !== surnameIndex;
    const joins = slots.length === 1 && firstJoins ? firstJoins : FORWARD_JOINS;
    const slotOpts = { caseSensitive: opts.caseSensitive, isSurname: k === surnameIndex, single: false, policy: opts.policy };

    let r: SlotResult | null = null;
    let at = j;
    if (j < tokens.length) {
      const g = slots.length ? joinOk(tokens, j, joins) : { ok: true, handle: false };
      if (g.ok) {
        r = matchSlot(tokens[j], part, slotOpts);
        if (g.handle && r) structural = true;
        if (!r && slots.length && allowExtra && !usedExtra && isWordToken(tokens[j]) && j + 1 < tokens.length) {
          const g2 = joinOk(tokens, j + 1, FORWARD_JOINS);
          const r2 = g2.ok ? matchSlot(tokens[j + 1], part, slotOpts) : null;
          if (r2) {
            usedExtra = true;
            structural = true;
            at = j + 1;
            r = r2;
          }
        }
      }
    }
    if (!r) {
      if (optional) {
        structural = true; // the bracketed part the query asked for is absent
        continue;
      }
      return null;
    }
    if (isBracketed(tokens[at]) !== part.bracketed) structural = true;
    slots.push(r);
    j = at + 1;
  }
  if (!slots.length) return null;
  return { endTok: j - 1, slots, structural };
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
    // Include the closing bracket of a bracketed last word: "Sarah Connor (Jnr)".
    const last = tokens[endTok];
    const end = isBracketed(last) ? last.end + 1 : last.baseEnd;
    found.push({ start, end, kind, len: end - start });
  };

  if (n === 1) {
    for (let i = 0; i < tokens.length; i++) {
      const r = matchSlot(tokens[i], parts[0], { caseSensitive: opts.caseSensitive, isSurname: true, single: true, policy: opts.policy });
      if (r) push(i, i, r.kind === 'fuzzy' ? 'fuzzy' : 'exact');
    }
    return resolve(found);
  }

  // The surname is the last part that isn't bracketed ("Sarah Connor (Jnr)").
  let sIdx = n - 1;
  while (sIdx > 0 && parts[sIdx].bracketed) sIdx--;
  const reversed = [parts[sIdx], ...parts.filter((_, k) => k !== sIdx)];
  for (let i = 0; i < tokens.length; i++) {
    const fwd = walk(tokens, i, parts, sIdx, true, null, opts);
    if (fwd && withinTotal(fwd.slots, opts.policy)) push(i, fwd.endTok, kindOf(fwd.slots, fwd.structural));
    const rev = walk(tokens, i, reversed, 0, n > 2, REVERSED_FIRST_JOINS, opts);
    if (rev && withinTotal(rev.slots, opts.policy)) push(i, rev.endTok, kindOf(rev.slots, true));
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
