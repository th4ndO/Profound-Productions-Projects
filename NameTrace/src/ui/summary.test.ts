import { describe, expect, it } from 'vitest';
import type { MatchKind, SearchHit, Unit } from '../model/types';
import { listJoin, plural, snippetRange, summarize } from './summary';

const hit = (fileId: string, group: string, best: MatchKind): SearchHit => ({
  record: { id: `${fileId}:${group}`, fileId, fileName: fileId, index: 0, group, source: group, kind: 'text', text: '', fields: null },
  spans: [],
  best,
});
const units = new Map<string, Unit>([
  ['a.pdf', { one: 'page', many: 'pages' }],
  ['b.xlsx', { one: 'sheet', many: 'sheets' }],
  ['c.xlsx', { one: 'sheet', many: 'sheets' }],
]);

describe('summary', () => {
  it('pluralises and joins lists', () => {
    expect(plural(1, 'file', 'files')).toBe('1 file');
    expect(plural(1234, 'entry', 'entries')).toBe('1 234 entries'.replace(' ', ' '));
    expect(listJoin(['a'])).toBe('a');
    expect(listJoin(['a', 'b'])).toBe('a and b');
    expect(listJoin(['a', 'b', 'c'])).toBe('a, b and c');
  });

  it('counts each file type in its own unit', () => {
    const hits = [hit('a.pdf', 'Page 1', 'exact'), hit('a.pdf', 'Page 1', 'exact'), hit('a.pdf', 'Page 3', 'fuzzy'), hit('b.xlsx', 'Sheet Payroll', 'exact'), hit('c.xlsx', 'Sheet Payroll', 'variant')];
    const s = summarize(hits, units, ' Sarah Connor ');
    expect(s.headline).toBe('Found 5 entries matching “Sarah Connor” across 2 pages and 2 sheets in 3 files');
    expect(s.breakdown).toBe('3 exact, 1 name variant, 1 possible typo');
  });

  it('uses singular forms', () => {
    const s = summarize([hit('a.pdf', 'Page 2', 'fuzzy')], units, 'Connor');
    expect(s.headline).toBe('Found 1 entry matching “Connor” across 1 page in 1 file');
    expect(s.breakdown).toBe('1 possible typo');
  });

  it('cuts snippets at word boundaries', () => {
    const text = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon';
    const at = text.indexOf('lambda');
    const r = snippetRange(text, at, at + 6, 20);
    const snip = text.slice(r.start, r.end);
    expect(snip).toContain('lambda');
    expect(text[r.start - 1]).toBe(' ');
    expect([' ', undefined]).toContain(text[r.end]);
    expect(snippetRange('short', 0, 5)).toEqual({ start: 0, end: 5 });
  });
});
