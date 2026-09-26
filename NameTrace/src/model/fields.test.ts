import { describe, expect, it } from 'vitest';
import { COLUMN_VALUE_CAP, columnStats, fieldRanges, fieldsToText } from './fields';
import type { FieldPair } from './types';

describe('fields', () => {
  it('maps each field to its range in the joined text', () => {
    const fields: FieldPair[] = [
      ['A', 'x'],
      ['B', 'hello'],
    ];
    const text = fieldsToText(fields);
    expect(text).toBe('x | hello');
    expect(fieldRanges({ fields }).map((r) => text.slice(r.start, r.end))).toEqual(['x', 'hello']);
  });

  it('collects columns in first-seen order with most common values first', () => {
    const rows = [
      { fields: [['Name', 'Ann'], ['Leader at 1728', 'Sarah Connor']] as FieldPair[] },
      { fields: [['Name', 'Bo'], ['Leader at 1728', 'Thabo Nkosi']] as FieldPair[] },
      { fields: [['Leader at 1728', 'Thabo Nkosi'], ['Extra', 'y']] as FieldPair[] },
      { fields: null },
    ];
    const stats = columnStats(rows);
    expect(stats.map((c) => c.name)).toEqual(['Name', 'Leader at 1728', 'Extra']);
    expect(stats[1]).toEqual({
      name: 'Leader at 1728',
      distinct: 2,
      values: [
        ['Thabo Nkosi', 2],
        ['Sarah Connor', 1],
      ],
    });
  });

  it('caps the stored values but reports the true distinct count', () => {
    const rows = Array.from({ length: COLUMN_VALUE_CAP + 50 }, (_, i) => ({ fields: [['Email', `p${i}@x.com`]] as FieldPair[] }));
    const [email] = columnStats(rows);
    expect(email.distinct).toBe(COLUMN_VALUE_CAP + 50);
    expect(email.values).toHaveLength(COLUMN_VALUE_CAP);
  });
});
