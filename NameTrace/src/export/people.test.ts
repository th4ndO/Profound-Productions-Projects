import { describe, expect, it } from 'vitest';
import { groupLeaders, peopleIn, rosterRoles, sortPeople } from '../leaders/leaders';
import { fieldsToText } from '../model/fields';
import type { FieldPair, NormRecord } from '../model/types';
import { buildPeopleCsv, buildPeoplePdf, buildPeopleText, type PeopleExport } from './people';

const COLS = ['Full Name', 'Leader at 1728', 'Address', 'Mobile Number', 'Email', 'Event Name', 'Event Type', 'First Visit'];
let n = 0;
function row(values: Record<string, string>): NormRecord {
  const fields = COLS.map((c) => [c, values[c] ?? ''] as FieldPair).filter(([, v]) => v !== '');
  const i = n++;
  return { id: `f:${i}`, fileId: 'f', fileName: 'roster.xlsx', index: i, group: 'Sheet Roster', source: `row ${i + 2}`, kind: 'record', text: fieldsToText(fields), fields };
}

function setup(): PeopleExport {
  const rows = [
    row({ 'Full Name': 'José Álvarez', 'Leader at 1728': 'Thabo Nkosi', 'Mobile Number': '0820000001', 'Event Name': 'Youth night', 'Event Type': 'Youth', 'First Visit': '1/10/2024' }),
    row({ 'Full Name': 'José Álvarez', 'Leader at 1728': 'Thabo (TK) Nkosi', 'Event Name': 'Sunday service', 'First Visit': '1/17/2024' }),
    // Formula-looking values must be neutralised in the CSV.
    row({ 'Full Name': '=HYPERLINK("http://x")', 'Leader at 1728': 'Thabo Nkosi', Address: '+27 Main Road', Email: '@home', 'First Visit': '2/1/2024' }),
  ];
  const roles = rosterRoles(COLS);
  const group = groupLeaders(rows, 'Leader at 1728', roles.name).find((g) => g.key === 'Thabo Nkosi')!;
  const people = sortPeople(peopleIn(group, 'Leader at 1728', roles), 'name');
  return { group, leaderColumn: 'Leader at 1728', roles, people, headline: 'Thabo Nkosi: 2 people', breakdown: '3 records' };
}

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

describe('people export', () => {
  it('CSV: one row per person, BOM, contacts, visits and variant count', () => {
    const csv = buildPeopleCsv(setup());
    expect(csv.startsWith('﻿')).toBe(true);
    const rows = parseCsv(csv.slice(1));
    expect(rows[0]).toEqual(['Name', 'Leader at 1728', 'Visits', 'First visit', 'Last visit', 'Mobile Number', 'Email', 'Address', 'Events', 'Leader written differently']);
    const jose = rows.find((r) => r[0] === 'José Álvarez')!;
    expect(jose.slice(0, 6)).toEqual(['José Álvarez', 'Thabo Nkosi', '2', '1/10/2024', '1/17/2024', '0820000001']);
    expect(jose[8]).toBe('Youth night (Youth) on 1/10/2024; Sunday service on 1/17/2024 [leader written “Thabo (TK) Nkosi”]');
    expect(jose[9]).toBe('1');
  });

  it('CSV: blocks formula injection in names and contact fields', () => {
    const rows = parseCsv(buildPeopleCsv(setup()).slice(1));
    const risky = rows.find((r) => r[0].includes('HYPERLINK'))!;
    expect(risky[0]).toBe(`'=HYPERLINK("http://x")`);
    expect(risky[6]).toBe("'@home");
    expect(risky[7]).toBe("'+27 Main Road");
  });

  it('copy text lists each person with contacts and events', () => {
    const txt = buildPeopleText(setup());
    expect(txt).toContain('1. =HYPERLINK("http://x") · 1 visit');
    expect(txt).toContain('2. José Álvarez · 2 visits');
    expect(txt).toContain('   Mobile Number: 0820000001');
    expect(txt).toContain('   Events: Youth night (Youth) on 1/10/2024; Sunday service on 1/17/2024 [leader written “Thabo (TK) Nkosi”]');
  });

  it('PDF: builds a report and keeps Latin accents', () => {
    const { bytes, replaced } = buildPeoplePdf(setup());
    expect(new TextDecoder('latin1').decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(replaced).toBe(false);
  });
});
