import { describe, expect, it } from 'vitest';
import { ParseError } from './common';
import { MAX_FILE_BYTES, checkSize, detectType } from './detect';
import { readMammothHtml } from './mammothHtml';
import { layoutPage, type PdfItem } from './pdfLayout';

const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe('detectType', () => {
  it('rejects unsupported types with specific advice', () => {
    expect(() => detectType('slides.pptx', enc('x'))).toThrow(/Export the slides as PDF/);
    expect(() => detectType('scan.jpg', enc('x'))).toThrow(/OCR/);
    expect(() => detectType('thing.xyz', enc('x'))).toThrow(/\.xyz files are not supported/);
    expect(() => detectType('fake.pdf', enc('hello'))).toThrow(/isn’t a valid PDF/);
  });
  it('reads HTML tables saved as .xls with the spreadsheet parser', () => {
    expect(detectType('export.xls', enc('<table><tr><td>A</td></tr></table>'))).toBe('xlsx');
  });
  it('recognises text formats by extension', () => {
    expect(detectType('a.csv', enc('a,b'))).toBe('csv');
    expect(detectType('a.TSV', enc('a\tb'))).toBe('tsv');
    expect(detectType('a.md', enc('# x'))).toBe('text');
    expect(detectType('a.json', enc('{}'))).toBe('json');
  });
  it('rejects files over 60 MB', () => {
    expect(() => checkSize(MAX_FILE_BYTES + 1)).toThrow(ParseError);
    expect(() => checkSize(MAX_FILE_BYTES + 1)).toThrow(/up to 60 MB/);
    expect(() => checkSize(MAX_FILE_BYTES)).not.toThrow();
  });
});

describe('layoutPage', () => {
  const item = (str: string, x: number, y: number, width = str.length * 5, size = 10): PdfItem => ({ str, x, y, width, size });

  it('adds spaces from x-gaps, not blindly', () => {
    const p = layoutPage([item('Sar', 0, 100, 15), item('ah', 15, 100, 10), item('Connor', 28, 100, 30)]);
    expect(p).toEqual(['Sarah Connor']);
  });
  it('splits paragraphs on gaps over 1.45× the median line gap', () => {
    const lines = [item('one', 0, 200), item('two', 0, 188), item('three', 0, 176), item('four', 0, 150), item('five', 0, 138)];
    expect(layoutPage(lines)).toEqual(['one two three', 'four five']);
  });
  it('starts a new paragraph at bullet lines', () => {
    expect(layoutPage([item('Intro text', 0, 200), item('• first', 0, 188), item('• second', 0, 176)])).toEqual(['Intro text', '• first', '• second']);
  });
  it('rejoins words hyphenated across lines but keeps real hyphens', () => {
    expect(layoutPage([item('the commit-', 0, 200), item('tee met', 0, 188)])).toEqual(['the committee met']);
    expect(layoutPage([item('born in Stratford-', 0, 200), item('Upon-Avon', 0, 188)])).toEqual(['born in Stratford- Upon-Avon']);
  });
  it('orders lines top to bottom regardless of item order', () => {
    expect(layoutPage([item('second', 0, 188), item('first', 0, 200)])).toEqual(['first second']);
  });
});

describe('readMammothHtml (no DOMParser)', () => {
  it('reads headings, paragraphs, lists, tables and entities', () => {
    const html =
      '<h1>Associates</h1><p>Hello <strong>Sarah&nbsp;Connor</strong> &amp; co.</p>' +
      '<ul><li>One<ul><li>Nested</li></ul></li><li>Two</li></ul>' +
      '<table><tr><th><p>Name</p></th><th><p>Role</p></th></tr><tr><td><p>Kyle</p><p>Reese</p></td><td>Lead</td></tr></table>' +
      '<p>Line<br />break &#233; &#x41;</p>';
    expect(readMammothHtml(html)).toEqual([
      { type: 'heading', text: 'Associates' },
      { type: 'paragraph', text: 'Hello Sarah Connor & co.' },
      { type: 'listItem', text: 'One' },
      { type: 'listItem', text: 'Nested' },
      { type: 'listItem', text: 'Two' },
      {
        type: 'table',
        rows: [
          ['Name', 'Role'],
          ['Kyle Reese', 'Lead'],
        ],
      },
      { type: 'paragraph', text: 'Line break é A' },
    ]);
  });
  it('flattens nested tables into the outer cell', () => {
    const html = '<table><tr><td>Outer <table><tr><td>inner</td></tr></table></td><td>B</td></tr></table>';
    expect(readMammothHtml(html)).toEqual([{ type: 'table', rows: [['Outer inner', 'B']] }]);
  });
  it('never touches DOMParser', () => {
    expect(typeof (globalThis as { DOMParser?: unknown }).DOMParser).toBe('undefined');
  });
});
