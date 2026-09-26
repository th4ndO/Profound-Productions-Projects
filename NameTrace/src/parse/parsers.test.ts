import { describe, expect, it } from 'vitest';
import { buildIndex, searchFiles } from '../match/search';
import { fieldRanges } from '../model/fields';
import { parseFixture } from '../testing/fixtures';
import { ParseError } from './common';

const sources = (r: { records: { source: string }[] }) => r.records.map((x) => x.source);

async function sarahHits(name: string, field?: string) {
  const doc = await parseFixture(name);
  return searchFiles([{ records: doc.records, index: buildIndex(doc.records) }], 'Sarah Connor', { exactOnly: false, caseSensitive: false, field });
}

describe('CSV / TSV', () => {
  it('uses the header row and real line numbers, even after multi-line cells', async () => {
    const doc = await parseFixture('people.csv');
    expect(doc.type).toBe('csv');
    expect(sources(doc)).toEqual(['Row 2', 'Row 3', 'Row 5', 'Row 6']);
    expect(doc.records[1].fields).toEqual([
      ['Full Name', 'Kyle Reese'],
      ['Leader at 1728', 'Sarah Connor'],
      ['Email', 'kyle@example.com'],
      ['Notes', 'Met at the youth camp, follow up next week'],
    ]);
    // Header text is never part of the searchable text.
    expect(doc.records.every((r) => !r.text.includes('Full Name'))).toBe(true);
  });
  it('reads TSV', async () => {
    const doc = await parseFixture('people.tsv');
    expect(doc.type).toBe('tsv');
    expect(doc.records).toHaveLength(3);
    expect(doc.records[0].fields![0]).toEqual(['Name', 'Connor, Sarah']);
  });
  it('finds Sarah Connor in the expected rows', async () => {
    expect((await sarahHits('people.csv')).map((h) => [h.record.source, h.best])).toEqual([
      ['Row 2', 'exact'],
      ['Row 3', 'exact'],
      ['Row 6', 'variant'],
    ]);
  });
});

describe('workbooks', () => {
  for (const name of ['roster-export.xls', 'roster.ods', 'legacy-biff8.xls']) {
    it(`${name}: one record per row with real sheet row numbers`, async () => {
      const doc = await parseFixture(name);
      expect(doc.type).toBe('xlsx');
      expect(sources(doc)).toEqual([
        'Sheet “Roster”, row 3',
        'Sheet “Roster”, row 4',
        'Sheet “Roster”, row 5',
        'Sheet “Roster”, row 7',
        'Sheet “Payroll”, row 2',
        'Sheet “Payroll”, row 3',
      ]);
      expect(doc.records[0].group).toBe('Sheet Roster');
      expect(doc.warnings).toEqual(['Sheet “Sheet2” is empty.']);
      // Dates come through as Excel displays them. (SheetJS's ODS *writer* drops
      // number formats, so the generated .ods fixture holds a bare serial.)
      if (!name.endsWith('.ods')) expect(doc.records[0].fields!.find(([k]) => k === 'First Visit')![1]).toBe('1/10/2024');
    });
  }
  it('an .xlsx saved with a .xls name is detected by content', async () => {
    expect((await parseFixture('roster-export.xls')).type).toBe('xlsx');
  });
  it('scopes a search to the “Leader at 1728” column', async () => {
    const all = await sarahHits('roster-export.xls');
    expect(all.map((h) => h.record.source)).toEqual(['Sheet “Roster”, row 3', 'Sheet “Roster”, row 4', 'Sheet “Roster”, row 5', 'Sheet “Payroll”, row 2']);
    const leader = await sarahHits('roster-export.xls', 'Leader at 1728');
    expect(leader.map((h) => [h.record.source, h.best])).toEqual([
      ['Sheet “Roster”, row 3', 'exact'],
      ['Sheet “Roster”, row 4', 'fuzzy'],
    ]);
    const [span] = leader[0].spans;
    const range = fieldRanges(leader[0].record).find((r) => r.key === 'Leader at 1728')!;
    expect(span.start).toBe(range.start);
    expect(leader[0].record.text.slice(span.start, span.end)).toBe('Sarah Connor');
  });
});

describe('plain text', () => {
  it('splits on blank lines, and bullet blocks line by line', async () => {
    const doc = await parseFixture('notes.txt');
    expect(sources(doc)).toEqual([
      'Paragraph 1 (line 1)',
      'Paragraph 2 (line 3)',
      'Paragraph 3 (line 6)',
      'Paragraph 4 (line 7)',
      'Paragraph 5 (line 8)',
      'Paragraph 6 (line 10)',
    ]);
    expect(doc.unit).toEqual({ one: 'paragraph', many: 'paragraphs' });
  });
  it('splits line by line when there are no blank lines', async () => {
    const doc = await parseFixture('app.log');
    expect(sources(doc)).toEqual(['Line 1', 'Line 2', 'Line 3']);
  });
  it('uses Markdown headings as sections', async () => {
    const doc = await parseFixture('plan.md');
    expect(doc.unit.many).toBe('sections');
    expect(sources(doc)).toEqual([
      'Associates, heading (line 1)',
      'Associates, paragraph 1 (line 3)',
      'Follow-ups, heading (line 5)',
      'Follow-ups, paragraph 1 (line 7)',
      'Follow-ups, paragraph 2 (line 8)',
      'Follow-ups, paragraph 3 (line 10)',
    ]);
  });
  it('does not match across a sentence boundary in real text', async () => {
    const hits = await sarahHits('notes.txt');
    expect(hits.map((h) => h.record.source)).toEqual(['Paragraph 2 (line 3)', 'Paragraph 4 (line 7)']);
  });
});

describe('JSON', () => {
  it('turns array objects into records and object levels into records', async () => {
    const doc = await parseFixture('incidents.json');
    expect(sources(doc)).toEqual(['Top level', 'meta', 'incidents[0]', 'incidents[1]', 'incidents[1].notes[0]', 'incidents[2]']);
    expect(doc.records[2].fields).toEqual([
      ['id', '1'],
      ['reported_by.name', 'Sarah Connor'],
      ['reported_by.phone', '0820000003'],
      ['tags', 'urgent, venue'],
    ]);
    expect(doc.records[2].group).toBe('incidents');
  });
});

describe('DOCX', () => {
  it('tracks headings as sections and turns tables into field rows', async () => {
    const doc = await parseFixture('report.docx');
    expect(sources(doc)).toEqual([
      'Paragraph 1',
      'Associates, heading',
      'Associates, paragraph 1',
      'Associates, list item 1',
      'Associates, list item 2',
      'Associates, table 1, row 2',
      'Associates, table 1, row 3',
      'Finances, heading',
      'Finances, paragraph 1',
    ]);
    expect(doc.records[6].fields).toEqual([
      ['Name', 'Sarah Connor'],
      ['Role', 'Lead'],
    ]);
    expect(doc.records[2].group).toBe('Associates');
  });
});

describe('PDF', () => {
  it('rebuilds paragraphs, bullets and hyphenated words, with per-page progress', async () => {
    const progress: number[] = [];
    const doc = await parseFixture('minutes.pdf', (f) => progress.push(f));
    expect(sources(doc)).toEqual(['Page 1, paragraph 1', 'Page 1, paragraph 2', 'Page 1, paragraph 3', 'Page 1, paragraph 4', 'Page 2, paragraph 1', 'Page 3, paragraph 1']);
    expect(doc.records[1].text).toContain('rest of the committee members');
    expect(doc.records[5].text).toBe('Signed by S. Connor Ref:A-17');
    expect(progress.map((p) => p.toFixed(2))).toEqual(['0.33', '0.67', '1.00']);
  });
  it('warns that a scanned PDF needs OCR', async () => {
    const doc = await parseFixture('scanned.pdf');
    expect(doc.records).toHaveLength(0);
    expect(doc.warnings[0]).toMatch(/scanned.*OCR/s);
  });
  it('explains password-protected PDFs', async () => {
    await expect(parseFixture('locked.pdf')).rejects.toThrow(/password-protected/);
  });
});

describe('unsupported files', () => {
  it('tells the user what to do with a .doc', async () => {
    const err = await parseFixture('old-format.doc').catch((e) => e);
    expect(err).toBeInstanceOf(ParseError);
    expect(err.message).toMatch(/Save as → \.docx/);
  });
});
