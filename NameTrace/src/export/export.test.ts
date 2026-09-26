import { describe, expect, it } from 'vitest';
import { fieldsToText } from '../model/fields';
import type { FieldPair, NormRecord, SearchHit } from '../model/types';
import { buildPlainText } from './copy';
import { buildCsv, safeCell } from './csv';
import { buildPdf } from './pdf';
import { toPdfText } from './pdfText';

const textHit: SearchHit = {
  record: { id: 'a:0', fileId: 'a', fileName: 'notes.txt', index: 0, group: 'P1', source: 'Paragraph 1 (line 1)', kind: 'text', text: 'Met José "Sarah" Connor, today', fields: null },
  spans: [{ start: 4, end: 23, kind: 'variant' }],
  best: 'variant',
};
const fields: FieldPair[] = [
  ['Full Name', 'Sarah Connor'],
  ['Amount', '-1200'],
  ['Formula', '=HYPERLINK("http://x")'],
];
const rowRecord: NormRecord = { id: 'b:0', fileId: 'b', fileName: 'roster.xlsx', index: 0, group: 'Sheet A', source: 'Sheet “A”, row 2', kind: 'record', text: fieldsToText(fields), fields };
const rowHit: SearchHit = { record: rowRecord, spans: [{ start: 0, end: 12, kind: 'exact' }], best: 'exact' };

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (q) {
      if (c === '"' && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && csv[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += c;
  }
  return rows;
}

describe('CSV export', () => {
  const csv = buildCsv([textHit, rowHit]);
  it('starts with a UTF-8 BOM and the fixed columns, then the union of field columns', () => {
    expect(csv.startsWith('﻿File,Location,Match type,Matched text,Content,Full Name,Amount,Formula\r\n')).toBe(true);
  });
  it('quotes and escapes correctly, keeping accents', () => {
    const rows = parseCsv(csv.slice(1));
    expect(rows[1]).toEqual(['notes.txt', 'Paragraph 1 (line 1)', 'Name variant', 'José "Sarah" Connor', 'Met José "Sarah" Connor, today', '', '', '']);
  });
  it('blocks formula injection', () => {
    const rows = parseCsv(csv.slice(1));
    expect(rows[2].slice(5)).toEqual(['Sarah Connor', "'-1200", `'=HYPERLINK("http://x")`]);
    expect(['=1', '+1', '-1', '@x', '\tx', 'ok'].map(safeCell)).toEqual(["'=1", "'+1", "'-1", "'@x", "'\tx", 'ok']);
  });
});

describe('plain-text copy', () => {
  it('lists every hit with its location and content', () => {
    const txt = buildPlainText([textHit, rowHit], 'Found 2 entries', '1 exact, 1 name variant');
    expect(txt).toContain('1. notes.txt · Paragraph 1 (line 1) · Name variant · “José "Sarah" Connor”');
    expect(txt).toContain('   Full Name: Sarah Connor');
  });
});

describe('PDF export', () => {
  it('keeps Latin accents and replaces characters the fonts cannot draw', () => {
    expect(toPdfText('José Ñúñez “quoted” – ok')).toEqual({ text: 'José Ñúñez “quoted” – ok', replaced: false });
    expect(toPdfText('Лена 王')).toEqual({ text: '???? ?', replaced: true });
  });
  it('builds a landscape A4 document with page numbers', () => {
    const many = Array.from({ length: 80 }, () => textHit);
    const { bytes, replaced } = buildPdf(many, 'Sarah Connor', 'Found 80 entries', '80 name variants');
    const raw = new TextDecoder('latin1').decode(bytes);
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(replaced).toBe(false);
    const pages = raw.match(/\/Type \/Page\b/g)?.length ?? 0;
    expect(pages).toBeGreaterThan(1);
    expect(raw).toMatch(/\/MediaBox \[0 0 841\.8\d* 595\.2\d*\]/); // landscape A4 in points
    expect(raw).toContain(`Page 1 of ${pages}`);
  });
  it('flags non-Latin text', () => {
    const hit = { ...textHit, record: { ...textHit.record, text: 'Встреча Sarah Connor' } };
    expect(buildPdf([hit], 'Sarah Connor', 'Found 1 entry', '1 exact').replaced).toBe(true);
  });
});
