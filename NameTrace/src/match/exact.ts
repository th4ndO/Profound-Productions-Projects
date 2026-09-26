import type { MatchSpan } from '../model/types';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * "Exact match only": the query literally, as whole words, with any run of
 * whitespace in the query matching any run of whitespace in the text.
 * Accents are significant; case follows the toggle.
 */
export function buildExactRegex(query: string, caseSensitive: boolean): RegExp | null {
  const q = query.trim();
  if (!q) return null;
  const body = q.split(/\s+/).map(escapeRegExp).join('\\s+');
  // Only enforce a word boundary where the query itself starts/ends with a word character.
  const lead = /^[\p{L}\p{N}]/u.test(q) ? '(?<![\\p{L}\\p{M}\\p{N}])' : '';
  const trail = /[\p{L}\p{M}\p{N}]$/u.test(q) ? '(?![\\p{L}\\p{M}\\p{N}])' : '';
  return new RegExp(lead + body + trail, caseSensitive ? 'gu' : 'giu');
}

export function exactMatch(text: string, re: RegExp): MatchSpan[] {
  const spans: MatchSpan[] = [];
  re.lastIndex = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    spans.push({ start: m.index, end: m.index + m[0].length, kind: 'exact' });
  }
  return spans;
}
