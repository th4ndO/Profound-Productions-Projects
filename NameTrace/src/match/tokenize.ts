import { fold, stripAccents } from './normalize';

export interface Token {
  /** Offset of the first character in the original text. */
  start: number;
  /** Offset after the last character (includes an initial's dot). */
  end: number;
  /** End offset without a possessive suffix ("Connor's" → end of "Connor"). */
  baseEnd: number;
  /** Folded (accent- and case-insensitive) text without possessive suffix. */
  fold: string;
  /** Accent-stripped, case-kept text without possessive suffix. */
  cased: string;
  /** Single letter with a dot ("J.") or a single capital letter ("J"). */
  isInitial: boolean;
  /** True when an initial absorbed a following dot ("J."). */
  dotted: boolean;
  /** The raw text between the previous token's end and this token's start. */
  gapBefore: string;
}

const WORD = /[\p{L}\p{M}\p{N}'’-]+/gu;
const EDGE_JUNK = /^['’-]+|['’-]+$/g;
const HAS_ALNUM = /[\p{L}\p{N}]/u;
const POSSESSIVE = /['’]s?$/;

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let prevEnd = 0;
  WORD.lastIndex = 0;
  for (let m = WORD.exec(text); m; m = WORD.exec(text)) {
    let raw = m[0];
    let start = m.index;
    const lead = raw.length - raw.replace(/^['’-]+/, '').length;
    raw = raw.replace(EDGE_JUNK, '');
    start += lead;
    if (!raw || !HAS_ALNUM.test(raw)) continue;
    let end = start + raw.length;

    const letters = stripAccents(raw);
    const singleLetter = /^\p{L}$/u.test(letters);
    let isInitial = false;
    let dotted = false;
    if (singleLetter && text[end] === '.') {
      isInitial = true;
      dotted = true;
      end += 1;
      WORD.lastIndex = end;
    } else if (singleLetter && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) {
      isInitial = true;
    }

    const base = isInitial ? raw : raw.replace(POSSESSIVE, '') || raw;
    const baseEnd = isInitial ? end : start + base.length;

    tokens.push({
      start,
      end,
      baseEnd,
      fold: fold(base),
      cased: stripAccents(base),
      isInitial,
      dotted,
      gapBefore: text.slice(prevEnd, start),
    });
    prevEnd = end;
  }
  return tokens;
}

const cache = new WeakMap<object, Token[]>();
const stringCache = new Map<string, Token[]>();

/** Tokenise once per record object (or per string for ad-hoc text). */
export function tokensFor(owner: { text: string }): Token[] {
  let t = cache.get(owner);
  if (!t) {
    t = tokenize(owner.text);
    cache.set(owner, t);
  }
  return t;
}

export function tokensForString(text: string): Token[] {
  let t = stringCache.get(text);
  if (!t) {
    if (stringCache.size > 5000) stringCache.clear();
    t = tokenize(text);
    stringCache.set(text, t);
  }
  return t;
}

export type Joiner = 'space' | 'comma' | 'initial-dot' | 'handle' | 'break';

/**
 * Classify the text between two tokens. Only these joiners may sit inside a
 * name: whitespace, whitespace with one comma, nothing after an initial's dot,
 * or a lone "." / "_" as in emails and handles. Anything else breaks the name.
 */
export function classifyGap(gap: string, prev: Token | undefined): Joiner {
  if (gap === '') return prev?.dotted ? 'initial-dot' : 'break';
  if (/^\s+$/.test(gap)) return 'space';
  if (/^\s*,\s*$/.test(gap)) return 'comma';
  if (gap === '.' || gap === '_') return 'handle';
  return 'break';
}
