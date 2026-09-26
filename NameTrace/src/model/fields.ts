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
