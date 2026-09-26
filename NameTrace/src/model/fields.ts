import { FIELD_SEPARATOR, type FieldPair } from './types';

export interface FieldRange {
  key: string;
  value: string;
  start: number;
  end: number;
}

/** Join field values into a record's searchable text (keys never included). */
export function fieldsToText(fields: FieldPair[]): string {
  return fields.map(([, v]) => v).join(FIELD_SEPARATOR);
}

const rangeCache = new WeakMap<object, FieldRange[]>();

/** Where each field's value sits inside record.text (built by fieldsToText). */
export function fieldRanges(record: { fields: FieldPair[] | null }): FieldRange[] {
  if (!record.fields) return [];
  let r = rangeCache.get(record);
  if (!r) {
    r = [];
    let pos = 0;
    for (const [key, value] of record.fields) {
      r.push({ key, value, start: pos, end: pos + value.length });
      pos += value.length + FIELD_SEPARATOR.length;
    }
    rangeCache.set(record, r);
  }
  return r;
}

/** Distinct values of one column, for the column picker's suggestions. */
export interface ColumnStat {
  name: string;
  /** Most common values first, capped at COLUMN_VALUE_CAP. */
  values: [value: string, count: number][];
  distinct: number;
}

export const COLUMN_VALUE_CAP = 500;

/** Column names in first-seen order with their most common values. Runs in the worker. */
export function columnStats(records: { fields: FieldPair[] | null }[]): ColumnStat[] {
  const cols = new Map<string, Map<string, number>>();
  for (const r of records) {
    if (!r.fields) continue;
    for (const [k, v] of r.fields) {
      let m = cols.get(k);
      if (!m) cols.set(k, (m = new Map()));
      m.set(v, (m.get(v) ?? 0) + 1);
    }
  }
  return [...cols].map(([name, m]) => ({
    name,
    distinct: m.size,
    values: [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, COLUMN_VALUE_CAP),
  }));
}
