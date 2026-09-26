import { describe, expect, it } from 'vitest';
import { fieldsToText } from '../model/fields';
import type { FieldPair, NormRecord } from '../model/types';
import { buildLeaderIndex, groupLeaders, groupLeadersIndexed, leaderColumns, parseDate, peopleIn, rosterRoles, sameLeader, sortPeople } from './leaders';

const COLS = ['Full Name', 'Leader at 12', 'Leader at 144', 'Leader at 1728', 'Address', 'Mobile Number', 'Email', 'Event Name', 'Event Type', 'First Visit'];
let n = 0;
function row(name: string, leader: string, event: string, date: string, extra: Partial<Record<string, string>> = {}): NormRecord {
  const values: Record<string, string> = {
    'Full Name': name,
    'Leader at 12': 'Grace Mahlangu',
    'Leader at 144': 'Peter Coetzee',
    'Leader at 1728': leader,
    Address: '',
    'Mobile Number': '',
    Email: '',
    'Event Name': event,
    'Event Type': 'Service',
    'First Visit': date,
    ...extra,
  };
  const fields = COLS.map((c) => [c, values[c]] as FieldPair).filter(([, v]) => v !== '');
  const i = n++;
  return { id: `f:${i}`, fileId: 'f', fileName: 'roster.xlsx', index: i, group: 'Sheet Roster', source: `Sheet “Roster”, row ${i + 2}`, kind: 'record', text: fieldsToText(fields), fields };
}

describe('column detection', () => {
  it('prefers Leader at 1728', () => {
    expect(leaderColumns(COLS)).toEqual(['Leader at 1728', 'Leader at 12', 'Leader at 144']);
    expect(leaderColumns(['Name', 'Email'])).toEqual([]);
  });
  it('finds roster roles', () => {
    expect(rosterRoles(COLS)).toEqual({
      name: 'Full Name',
      mobile: 'Mobile Number',
      email: 'Email',
      address: 'Address',
      event: 'Event Name',
      eventType: 'Event Type',
      date: 'First Visit',
    });
  });
});

describe('leader spellings', () => {
  it('treats a bracketed nickname or small typo as the same leader, but not different people', () => {
    expect(sameLeader('Thabo Nkosi', 'Thabo (TK) Nkosi')).toBe(true);
    expect(sameLeader('Thabo (TK) Nkosi', 'Thabo Nkosi')).toBe(true);
    expect(sameLeader('Sarah Connor', 'sarah connor')).toBe(true);
    expect(sameLeader('Sarah Connor', 'Sarah Conner')).toBe(true);
    expect(sameLeader('Sarah Connor', 'John Connor')).toBe(false);
    expect(sameLeader('Sarah Connor', 'Sarah Connor-Smith')).toBe(false);
    expect(sameLeader('Thabo Nkosi', 'Thabo Nkosi and Megan Botha')).toBe(false);
  });
});

describe('grouping and people', () => {
  const rows = [
    row('Aisha Pillay', 'Thabo Nkosi', 'Youth night', '1/10/2024', { 'Mobile Number': '0820000001' }),
    row('Aisha Pillay', 'Thabo Nkosi', 'Sunday service', '1/17/2024', { 'Mobile Number': '0820000001', Email: 'aisha@example.com' }),
    row('aisha  pillay', 'Thabo (TK) Nkosi', 'Prayer', '2024/02/04'),
    row('Kyle Reese', 'Thabo Nkosi', 'Sunday service', '1/17/2024'),
    row('Lerato Dlamini', 'Megan Botha', 'Youth night', '1/10/2024'),
    row('Sipho Khumalo', '', 'Youth night', '1/10/2024'),
  ];
  const roles = rosterRoles(COLS);
  const groups = groupLeaders(rows, 'Leader at 1728', roles.name);

  it('merges spellings and counts people, with the unassigned group last', () => {
    expect(groups.map((g) => [g.name, g.rows.length, g.people])).toEqual([
      ['Megan Botha', 1, 1],
      ['Thabo Nkosi', 4, 2],
      ['No leader listed', 1, 1],
    ]);
    expect(groups[1].spellings).toEqual([
      ['Thabo Nkosi', 3],
      ['Thabo (TK) Nkosi', 1],
    ]);
  });

  it('lists each person once with every visit, contacts, and variant marks', () => {
    const people = sortPeople(peopleIn(groups[1], 'Leader at 1728', roles), 'name');
    expect(people.map((p) => [p.name, p.visits.length, p.variantRows])).toEqual([
      ['Aisha Pillay', 3, 1],
      ['Kyle Reese', 1, 0],
    ]);
    const aisha = people[0];
    expect(aisha.visits.map((v) => [v.event, v.date, v.leaderAs])).toEqual([
      ['Youth night', '1/10/2024', null],
      ['Sunday service', '1/17/2024', null],
      ['Prayer', '2024/02/04', 'Thabo (TK) Nkosi'],
    ]);
    expect(aisha.details).toEqual([
      ['Leader at 12', ['Grace Mahlangu']],
      ['Leader at 144', ['Peter Coetzee']],
      ['Mobile Number', ['0820000001']],
      ['Email', ['aisha@example.com']],
    ]);
    expect(sortPeople(people, 'visits')[0].name).toBe('Aisha Pillay');
    expect(sortPeople(people, 'recent')[0].name).toBe('Aisha Pillay');
  });

  it('ignores sheets that have no leader column', () => {
    const payroll: NormRecord = { ...row('Connor, Sarah', 'x', 'x', 'x'), group: 'Sheet Payroll', fields: [['Employee', 'Connor, Sarah']], text: 'Connor, Sarah' };
    const g = groupLeaders([...rows, payroll], 'Leader at 1728', roles.name);
    expect(g.map((x) => [x.name, x.rows.length])).toEqual([
      ['Megan Botha', 1],
      ['Thabo Nkosi', 4],
      ['No leader listed', 1],
    ]);
  });

  it('the worker-built index groups exactly like the direct version, across files', () => {
    const other = rows.map((r) => ({ ...r, id: `g:${r.index}`, fileId: 'g' }));
    const files = [rows, other].map((records) => ({ records, leaders: buildLeaderIndex(records, COLS) }));
    const direct = groupLeaders([...rows, ...other], 'Leader at 1728', roles.name);
    const indexed = groupLeadersIndexed(files, 'Leader at 1728');
    expect(indexed.map((g) => [g.key, g.name, g.spellings, g.rows.map((r) => r.id), g.people])).toEqual(
      direct.map((g) => [g.key, g.name, g.spellings, g.rows.map((r) => r.id), g.people]),
    );
  });

  it('parses the date formats seen in exports', () => {
    expect(parseDate('1/17/2024')).toBe(Date.UTC(2024, 0, 17));
    expect(parseDate('2024/01/14')).toBe(Date.UTC(2024, 0, 14));
    expect(parseDate('17/1/2024')).toBe(Date.UTC(2024, 0, 17));
    expect(parseDate('')).toBeNull();
    expect(parseDate('soon')).toBeNull();
  });
});
