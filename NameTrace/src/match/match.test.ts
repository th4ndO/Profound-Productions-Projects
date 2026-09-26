import { describe, expect, it } from 'vitest';
import type { MatchKind, NormRecord, SearchOptions } from '../model/types';
import { buildExactRegex, exactMatch } from './exact';
import { fold, osaDistance, partBudget, singleWordBudget } from './normalize';
import { parseQuery } from './query';
import { buildIndex, searchFiles } from './search';
import { PackedIndex, packIndex } from './tokenIndex';
import { smartMatch, type FuzzyPolicy } from './smart';
import { classifyGap, tokenize } from './tokenize';

type Found = { text: string; kind: MatchKind };

function smart(text: string, q: string, caseSensitive = false, policy: FuzzyPolicy = 'strict'): Found[] {
  const query = parseQuery(q)!;
  return smartMatch(tokenize(text), query, { caseSensitive, policy }).map((s) => ({
    text: text.slice(s.start, s.end),
    kind: s.kind,
  }));
}

function exact(text: string, q: string, caseSensitive = false): string[] {
  return exactMatch(text, buildExactRegex(q, caseSensitive)!).map((s) => text.slice(s.start, s.end));
}

describe('normalize', () => {
  it('folds accents and case', () => {
    expect(fold('José ÁLVAREZ')).toBe('jose alvarez');
    expect(fold('Zoë')).toBe('zoe');
  });

  it('computes optimal string alignment distance', () => {
    expect(osaDistance('connor', 'connor')).toBe(0);
    expect(osaDistance('connor', 'conner')).toBe(1);
    expect(osaDistance('sarah', 'sarha')).toBe(1); // transposition counts once
    expect(osaDistance('ca', 'abc')).toBe(3); // OSA, not full Damerau
    expect(osaDistance('connor', 'cannon')).toBe(2);
    expect(osaDistance('alexander', 'bob', 2)).toBe(3); // early exit returns max + 1
  });

  it('scales the typo budget by name length', () => {
    expect([3, 4, 5, 6, 12].map(partBudget)).toEqual([0, 1, 1, 2, 2]);
    expect([4, 5, 7, 8].map(singleWordBudget)).toEqual([0, 1, 1, 2]);
  });
});

describe('tokenize', () => {
  it('keeps original offsets, apostrophes and hyphens', () => {
    const text = "  O'Brien-Smith met Zoë";
    const toks = tokenize(text);
    expect(toks.map((t) => text.slice(t.start, t.end))).toEqual(["O'Brien-Smith", 'met', 'Zoë']);
    expect(toks[2].fold).toBe('zoe');
  });

  it('captures a trailing dot only for initials', () => {
    const toks = tokenize('Sarah J. Connor. Dr. Who');
    expect(toks.map((t) => [t.fold, t.isInitial, t.dotted])).toEqual([
      ['sarah', false, false],
      ['j', true, true],
      ['connor', false, false],
      ['dr', false, false],
      ['who', false, false],
    ]);
    expect(toks[3].gapBefore).toBe('. ');
  });

  it('strips possessives from the comparable form but not the text', () => {
    const text = "Sarah Connor's file";
    const t = tokenize(text)[1];
    expect(t.fold).toBe('connor');
    expect(text.slice(t.start, t.baseEnd)).toBe('Connor');
  });

  it('classifies joiners', () => {
    const [a, b] = tokenize('J.Connor');
    expect(classifyGap(b.gapBefore, a)).toBe('initial-dot');
    expect(classifyGap(' ', undefined)).toBe('space');
    expect(classifyGap(' , ', undefined)).toBe('comma');
    expect(classifyGap(',,', undefined)).toBe('break');
    expect(classifyGap('.', undefined)).toBe('handle');
    expect(classifyGap('_', undefined)).toBe('handle');
    expect(classifyGap('. ', undefined)).toBe('break');
    expect(classifyGap(' | ', undefined)).toBe('break');
    expect(classifyGap('; ', undefined)).toBe('break');
  });
});

describe('parseQuery', () => {
  it('reorders "Last, First"', () => {
    expect(parseQuery('Connor, Sarah')!.display).toBe('Sarah Connor');
    expect(parseQuery('Connor, Sarah Jane')!.parts.map((p) => p.fold)).toEqual(['sarah', 'jane', 'connor']);
  });
  it('treats single letters as initials', () => {
    expect(parseQuery('s connor')!.parts[0].isInitial).toBe(true);
  });
  it('returns null for empty input', () => {
    expect(parseQuery('   ')).toBeNull();
    expect(parseQuery('!!')).toBeNull();
  });
});

describe('smart match: accepted forms', () => {
  it('exact, with flexible whitespace', () => {
    expect(smart('Report by Sarah Connor today', 'Sarah Connor')).toEqual([{ text: 'Sarah Connor', kind: 'exact' }]);
    expect(smart('Sarah\n  Connor', 'sarah connor')).toEqual([{ text: 'Sarah\n  Connor', kind: 'exact' }]);
  });

  it('is accent-insensitive (still exact)', () => {
    expect(smart('José Álvarez signed', 'Jose Alvarez')).toEqual([{ text: 'José Álvarez', kind: 'exact' }]);
    expect(smart('Jose Alvarez signed', 'José Álvarez')).toEqual([{ text: 'Jose Alvarez', kind: 'exact' }]);
  });

  it('reversed, with or without a comma', () => {
    expect(smart('Connor, Sarah', 'Sarah Connor')).toEqual([{ text: 'Connor, Sarah', kind: 'variant' }]);
    expect(smart('CONNOR SARAH', 'Sarah Connor')).toEqual([{ text: 'CONNOR SARAH', kind: 'variant' }]);
    expect(smart('Connor, S.', 'Sarah Connor')).toEqual([{ text: 'Connor, S.', kind: 'variant' }]);
  });

  it('one middle name or initial', () => {
    expect(smart('Sarah J. Connor', 'Sarah Connor')).toEqual([{ text: 'Sarah J. Connor', kind: 'variant' }]);
    expect(smart('Sarah Jane Connor', 'Sarah Connor')).toEqual([{ text: 'Sarah Jane Connor', kind: 'variant' }]);
    expect(smart('Sarah J Connor', 'Sarah Connor')).toEqual([{ text: 'Sarah J Connor', kind: 'variant' }]);
  });

  it('initials for non-surname parts', () => {
    expect(smart('Signed: S. Connor', 'Sarah Connor')).toEqual([{ text: 'S. Connor', kind: 'variant' }]);
    expect(smart('S Connor', 'Sarah Connor')).toEqual([{ text: 'S Connor', kind: 'variant' }]);
    expect(smart('S.J. Connor', 'Sarah Jane Connor')).toEqual([{ text: 'S.J. Connor', kind: 'variant' }]);
  });

  it('email and handle joins', () => {
    expect(smart('mail sarah.connor@x.com now', 'Sarah Connor')).toEqual([{ text: 'sarah.connor', kind: 'variant' }]);
    expect(smart('@sarah_connor', 'Sarah Connor')).toEqual([{ text: 'sarah_connor', kind: 'variant' }]);
    expect(smart('s.connor@x.com', 'Sarah Connor')).toEqual([{ text: 's.connor', kind: 'variant' }]);
  });

  it('possessives highlight only the name', () => {
    expect(smart("Sarah Connor's badge", 'Sarah Connor')).toEqual([{ text: 'Sarah Connor', kind: 'exact' }]);
  });

  it('possible typos within budget', () => {
    expect(smart('Sarah Conner', 'Sarah Connor')).toEqual([{ text: 'Sarah Conner', kind: 'fuzzy' }]);
    expect(smart('Sarha Connor', 'Sarah Connor')).toEqual([{ text: 'Sarha Connor', kind: 'fuzzy' }]);
    expect(smart('Sara Connor', 'Sarah Connor')).toEqual([{ text: 'Sara Connor', kind: 'fuzzy' }]);
    expect(smart('Connor, Sarha', 'Sarah Connor')).toEqual([{ text: 'Connor, Sarha', kind: 'fuzzy' }]);
  });

  it('a query typed "Last, First" finds the forward form', () => {
    expect(smart('Sarah Connor', 'Connor, Sarah')).toEqual([{ text: 'Sarah Connor', kind: 'exact' }]);
  });

  it('finds several mentions with correct spans', () => {
    const text = 'Sarah Connor met Connor, Sarah and S. Connor.';
    const q = parseQuery('Sarah Connor')!;
    const spans = smartMatch(tokenize(text), q, { caseSensitive: false });
    expect(spans.map((s) => [s.start, s.end, s.kind])).toEqual([
      [0, 12, 'exact'],
      [17, 30, 'variant'],
      [35, 44, 'variant'],
    ]);
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual(['Sarah Connor', 'Connor, Sarah', 'S. Connor']);
  });
});

describe('bracketed name parts', () => {
  it('a bracketed nickname or maiden name is part of the name', () => {
    expect(smart('Leader: Nomsa (Mo) Dlamini', 'Nomsa (Mo) Dlamini')).toEqual([{ text: 'Nomsa (Mo) Dlamini', kind: 'exact' }]);
    expect(smart('Nomsa (Mo) Dlamini', 'Nomsa Dlamini')).toEqual([{ text: 'Nomsa (Mo) Dlamini', kind: 'variant' }]);
    expect(smart('Sarah (Connor)', 'Sarah Connor')).toEqual([{ text: 'Sarah (Connor)', kind: 'variant' }]);
  });
  it('a bracketed part in the query is optional', () => {
    expect(smart('Nomsa Dlamini', 'Nomsa (Mo) Dlamini')).toEqual([{ text: 'Nomsa Dlamini', kind: 'variant' }]);
    expect(smart('Sarah Connor (Jnr) arrived', 'Sarah Connor (Jnr)')).toEqual([{ text: 'Sarah Connor (Jnr)', kind: 'exact' }]);
    expect(smart('Sarah Connor arrived', 'Sarah Connor (Jnr)')).toEqual([{ text: 'Sarah Connor', kind: 'variant' }]);
  });
  it('brackets around more than one word still break the name', () => {
    expect(smart('Sarah (see the note) Connor', 'Sarah Connor')).toEqual([]);
    expect(smart('Sarah (see) (note) Connor', 'Sarah Connor')).toEqual([]);
  });
});

describe('smart match: must NOT match', () => {
  it('across a sentence boundary', () => {
    expect(smart('John Connor. Sarah Smith', 'Sarah Connor')).toEqual([]);
    expect(smart('Sarah. Connor', 'Sarah Connor')).toEqual([]);
  });
  it('across the field separator or other punctuation', () => {
    expect(smart('Sarah | Connor', 'Sarah Connor')).toEqual([]);
    expect(smart('Connor | Sarah', 'Sarah Connor')).toEqual([]);
    expect(smart('Sarah; Connor', 'Sarah Connor')).toEqual([]);
    expect(smart('Sarah/Connor', 'Sarah Connor')).toEqual([]);
    expect(smart('Sarah, Connor', 'Sarah Connor')).toEqual([]); // comma only allowed in reversed order
    expect(smart('Connor,, Sarah', 'Sarah Connor')).toEqual([]);
  });
  it('with two middle names', () => {
    expect(smart('Sarah Jane Anne Connor', 'Sarah Connor')).toEqual([]);
  });
  it('an initial for the surname', () => {
    expect(smart('Sarah C.', 'Sarah Connor')).toEqual([]);
  });
  it('words that only resemble the name', () => {
    expect(smart('Sarahs Connorville', 'Sarah Connor')).toEqual([]);
    expect(smart('Karen Connor', 'Sarah Connor')).toEqual([]);
  });
  it('typos over budget, or on short parts', () => {
    expect(smart('Sarah Cxnxxr', 'Sarah Connor', false, 'brief')).toEqual([]); // 3 edits
    expect(smart('Ann Lee', 'Ana Lee')).toEqual([]); // 3-letter parts get no typo budget
    expect(smart('Tom Leex', 'Tom Lee')).toEqual([]);
  });
  it('strict policy rejects first-letter changes and >2 total edits', () => {
    expect(smart('Sarah Cannon', 'Sarah Connor')).toEqual([]);
    expect(smart('Sarah Cannon', 'Sarah Connor', false, 'brief')).toEqual([{ text: 'Sarah Cannon', kind: 'fuzzy' }]);
    expect(smart('Sarha Conner', 'Sarah Connor')).toEqual([{ text: 'Sarha Conner', kind: 'fuzzy' }]); // 1 + 1
    expect(smart('Sarah Cnonor', 'Sarah Connor')).toEqual([{ text: 'Sarah Cnonor', kind: 'fuzzy' }]); // transposition = 1
    expect(smart('Sarah Coonnrr', 'Sarah Connor')).toEqual([]); // 2 edits on a 6-letter part
    expect(smart('Sarah Coonnrr', 'Sarah Connor', false, 'brief')).toEqual([{ text: 'Sarah Coonnrr', kind: 'fuzzy' }]);
    expect(smart('Alexandre Wilkinsen', 'Alexander Wilkinson')).toEqual([{ text: 'Alexandre Wilkinsen', kind: 'fuzzy' }]); // 1 + 1 on 8+ letter parts
    expect(smart('Alexandra Wilkinsen', 'Alexander Wilkinson')).toEqual([]); // 2 + 1 = 3 edits
    expect(smart('Sraha Cannor', 'Sarah Connor')).toEqual([]); // 2 + 1 = 3 edits
    expect(smart('Tarah Connor', 'Sarah Connor')).toEqual([]);
    expect(smart('Tarah Connor', 'Sarah Connor', false, 'brief')).toEqual([{ text: 'Tarah Connor', kind: 'fuzzy' }]);
  });
});

describe('case-sensitive mode', () => {
  it('a casing difference is a miss, never a typo', () => {
    expect(smart('sarah connor', 'Sarah Connor', true)).toEqual([]);
    expect(smart('Sarah connor', 'Sarah Connor', true)).toEqual([]);
    expect(smart('SARAH CONNOR', 'Sarah Connor', true)).toEqual([]);
    expect(smart('sarah conner', 'Sarah Connor', true)).toEqual([]);
  });
  it('still matches correct casing, accents and variants', () => {
    expect(smart('Sarah Connor', 'Sarah Connor', true)).toEqual([{ text: 'Sarah Connor', kind: 'exact' }]);
    expect(smart('Sarah Conner', 'Sarah Connor', true)).toEqual([{ text: 'Sarah Conner', kind: 'fuzzy' }]);
    expect(smart('José Connor', 'Jose Connor', true)).toEqual([{ text: 'José Connor', kind: 'exact' }]);
    expect(smart('Connor, S.', 'Sarah Connor', true)).toEqual([{ text: 'Connor, S.', kind: 'variant' }]);
    expect(smart('Connor, s.', 'Sarah Connor', true)).toEqual([]);
  });
});

describe('single-word queries', () => {
  it('use the stricter budget', () => {
    expect(smart('Connor was here', 'Connor')).toEqual([{ text: 'Connor', kind: 'exact' }]);
    expect(smart('Conner was here', 'Connor')).toEqual([{ text: 'Conner', kind: 'fuzzy' }]);
    expect(smart('Cnonrr was here', 'Connor')).toEqual([]); // 2+ edits, budget 1 for 6 letters
    expect(smart('Jon', 'John')).toEqual([]); // ≤4 letters: no typos
    expect(smart('Alexandre', 'Alexander')).toEqual([{ text: 'Alexandre', kind: 'fuzzy' }]);
  });
  it('do not treat initials as a match', () => {
    expect(smart('C. Smith', 'Connor')).toEqual([]);
  });
});

describe('exact mode', () => {
  it('matches the query literally as whole words', () => {
    expect(exact('Sarah Connor, Sarah  Connor, SarahConnor', 'Sarah Connor')).toEqual(['Sarah Connor', 'Sarah  Connor']);
    expect(exact('Sarah Connorville', 'Sarah Connor')).toEqual([]);
    expect(exact('Connor, Sarah', 'Sarah Connor')).toEqual([]);
    expect(exact('Sarah J. Connor', 'Sarah Connor')).toEqual([]);
  });
  it('respects case and accents', () => {
    expect(exact('sarah connor', 'Sarah Connor')).toEqual(['sarah connor']);
    expect(exact('sarah connor', 'Sarah Connor', true)).toEqual([]);
    expect(exact('Jose Alvarez', 'José Álvarez')).toEqual([]);
  });
  it('never crosses the field separator', () => {
    expect(exact('Sarah | Connor', 'Sarah Connor')).toEqual([]);
  });
  it('escapes regex characters in the query', () => {
    expect(exact('Paid (Sarah) Connor', '(Sarah)')).toEqual(['(Sarah)']);
  });
});

describe('searchFiles', () => {
  const rec = (i: number, text: string): NormRecord => ({
    id: `f:${i}`,
    fileId: 'f',
    fileName: 'f.txt',
    index: i,
    group: 'Block 1',
    source: `Paragraph ${i + 1}`,
    kind: 'text',
    text,
    fields: null,
  });
  const records = [rec(0, 'Sarah Connor arrived'), rec(1, 'Connor, Sarah left'), rec(2, 'Nobody here'), rec(3, 'Sarah Conner typo')];
  const file = { records, index: buildIndex(records) };
  const run = (q: string, o: Partial<SearchOptions> = {}) =>
    searchFiles([file], q, { exactOnly: false, caseSensitive: false, ...o }).map((h) => [h.record.index, h.best]);

  it('uses the index and returns best kind per record', () => {
    expect(run('Sarah Connor')).toEqual([
      [0, 'exact'],
      [1, 'variant'],
      [3, 'fuzzy'],
    ]);
  });
  it('exact mode', () => {
    expect(run('Sarah Connor', { exactOnly: true })).toEqual([[0, 'exact']]);
  });
  it('scopes matches to one column of structured rows', () => {
    const fields: [string, string][] = [
      ['Full Name', 'Sarah Connor'],
      ['Leader at 1728', 'John Smith'],
    ];
    const rows: NormRecord[] = [
      { ...rec(0, 'Sarah Connor | John Smith'), kind: 'record', fields },
      { ...rec(1, 'John Smith | Sarah Connor'), kind: 'record', fields: [['Full Name', 'John Smith'], ['Leader at 1728', 'Sarah Connor']] },
      rec(2, 'Sarah Connor in plain text'),
    ];
    const f = { records: rows, index: buildIndex(rows) };
    const hits = searchFiles([f], 'Sarah Connor', { exactOnly: false, caseSensitive: false, field: 'Leader at 1728' });
    expect(hits.map((h) => h.record.index)).toEqual([1]);
    const [span] = hits[0].spans;
    expect(rows[1].text.slice(span.start, span.end)).toBe('Sarah Connor');
    expect(span.start).toBe('John Smith | '.length);
    const exactHits = searchFiles([f], 'Sarah Connor', { exactOnly: true, caseSensitive: false, field: 'Full Name' });
    expect(exactHits.map((h) => h.record.index)).toEqual([0]);
  });

  it('the packed index (used across the worker boundary) gives identical results', () => {
    const packed = { records, index: new PackedIndex(packIndex(buildIndex(records))) };
    for (const q of ['Sarah Connor', 'Connor', 'S. Connor', 'Sarah C']) {
      const a = searchFiles([file], q, { exactOnly: false, caseSensitive: false });
      const b = searchFiles([packed], q, { exactOnly: false, caseSensitive: false });
      expect(b).toEqual(a);
    }
    expect(packed.index.size).toBe(file.index.size);
    expect(Array.from(packed.index.get('connor')!)).toEqual(file.index.get('connor'));
  });

  it('empty query returns nothing', () => {
    expect(run('  ')).toEqual([]);
  });
});
