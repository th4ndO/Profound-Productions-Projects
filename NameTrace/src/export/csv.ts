import type { SearchHit } from '../model/types';
import { matchLabel, matchedText } from './common';

const BASE = ['File', 'Location', 'Match type', 'Matched text', 'Content'];

/**
 * Neutralise spreadsheet formula injection: a cell starting with = + - @ (or
 * a tab or carriage return) is prefixed with an apostrophe so Excel and
 * Sheets treat it as text.
 */
export function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function quote(value: string): string {
  const v = safeCell(value);
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Rows to CSV text, with a UTF-8 BOM so Excel reads accents correctly. */
export function buildCsvRows(rows: string[][]): string {
  return '\uFEFF' + rows.map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n';
}

/** CSV of all search hits. */
export function buildCsv(hits: SearchHit[]): string {
  const extra: string[] = [];
  const seen = new Set(BASE);
  for (const h of hits)
    for (const [k] of h.record.fields ?? []) {
      if (!seen.has(k)) {
        seen.add(k);
        extra.push(k);
      }
    }
  const rows = [[...BASE, ...extra]];
  for (const h of hits) {
    const fields = new Map(h.record.fields ?? []);
    rows.push([h.record.fileName, h.record.source, matchLabel(h), matchedText(h), h.record.text, ...extra.map((k) => fields.get(k) ?? '')]);
  }
  return buildCsvRows(rows);
}
