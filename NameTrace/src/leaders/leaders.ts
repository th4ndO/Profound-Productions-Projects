import { parseQuery } from '../match/query';
import { smartMatch } from '../match/smart';
import { isBracketed, tokenize } from '../match/tokenize';
import { fold } from '../match/normalize';
import type { NormRecord } from '../model/types';

/** Leader-like columns, best first: “Leader at 1728” beats other “leader” columns. */
export function leaderColumns(columns: string[]): string[] {
  const score = (c: string) => (/leader\s*(at|@)?\s*1728/i.test(c) ? 0 : /leader/i.test(c) ? 1 : 2);
  return columns.filter((c) => score(c) < 2).sort((a, b) => score(a) - score(b));
}

export interface RosterRoles {
  name: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  event: string | null;
  eventType: string | null;
  date: string | null;
}

/** Guess which columns hold the person's name, contact details and events. */
export function rosterRoles(columns: string[]): RosterRoles {
  const find = (re: RegExp, not?: RegExp) => columns.find((c) => re.test(c) && !(not && not.test(c))) ?? null;
  return {
    name: find(/^(full\s*)?name$/i) ?? find(/name/i, /leader|event|file|user/i),
    mobile: find(/mobile|cell|phone|tel/i),
    email: find(/e-?mail/i),
    address: find(/address/i),
    event: find(/event\s*name/i) ?? find(/^event$/i),
    eventType: find(/event\s*type/i),
    date: find(/first\s*visit/i) ?? find(/date|visit/i),
  };
}

export function fieldValue(r: NormRecord, key: string | null): string {
  if (!key || !r.fields) return '';
  for (const [k, v] of r.fields) if (k === key) return v;
  return '';
}

export const NO_LEADER = '';

export interface LeaderGroup {
  /** Stable key: the canonical spelling, or NO_LEADER. */
  key: string;
  /** Most common spelling. */
  name: string;
  /** Every spelling in this group with its row count, most common first. */
  spellings: [value: string, rows: number][];
  rows: NormRecord[];
  people: number;
}

/** Does `value` name the same leader as `name`? Uses the smart matcher in both directions. */
export function sameLeader(name: string, value: string): boolean {
  const covers = (q: string, text: string) => {
    const query = parseQuery(q);
    const tokens = tokenize(text);
    if (!query || !tokens.length) return false;
    const required = tokens.filter((t) => !isBracketed(t));
    if (!required.length) return false;
    const first = required[0].start;
    const last = required[required.length - 1].baseEnd;
    return smartMatch(tokens, query, { caseSensitive: false }).some((s) => s.start <= first && s.end >= last);
  };
  return covers(name, value) || covers(value, name);
}

const keyCache = new Map<string, string>();

/** Same person, however the name is spaced, cased or accented. Cached per distinct name. */
export function personKey(name: string): string {
  let k = keyCache.get(name);
  if (k === undefined) {
    // Plain ASCII needs no accent folding, which is the slow part.
    k = /^[\x20-\x7e]*$/.test(name)
      ? name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      : fold(name).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (keyCache.size > 200_000) keyCache.clear();
    keyCache.set(name, k);
  }
  return k;
}

function cleanValue(v: string): string {
  return v.includes('  ') || v !== v.trim() ? v.replace(/\s+/g, ' ').trim() : v;
}

/** Group rows by leader, merging spellings of the same leader. */
export function groupLeaders(records: NormRecord[], leaderColumn: string, nameColumn: string | null): LeaderGroup[] {
  // Only rows from sheets/tables that have the leader column count. Empty cells
  // are dropped during parsing, so a row without the field in such a sheet has
  // a blank leader, while rows from other sheets (e.g. Payroll) are skipped.
  const tables = new Map<string, Set<string>>(); // fileId → groups with the column
  for (const r of records) {
    if (!r.fields) continue;
    const seen = tables.get(r.fileId);
    if (seen?.has(r.group)) continue;
    if (r.fields.some(([k]) => k === leaderColumn)) {
      if (seen) seen.add(r.group);
      else tables.set(r.fileId, new Set([r.group]));
    }
  }
  const byValue = new Map<string, NormRecord[]>();
  for (const r of records) {
    if (!r.fields || !tables.get(r.fileId)?.has(r.group)) continue;
    const v = cleanValue(fieldValue(r, leaderColumn));
    let list = byValue.get(v);
    if (!list) byValue.set(v, (list = []));
    list.push(r);
  }
  // Most rows first; ties go to the spelling seen first in the file.
  const values = [...byValue].filter(([v]) => v !== NO_LEADER).sort((a, b) => b[1].length - a[1].length || a[1][0].index - b[1][0].index);
  const groups: LeaderGroup[] = [];
  for (const [value, rows] of values) {
    const g = groups.find((x) => sameLeader(x.name, value));
    if (g) {
      g.spellings.push([value, rows.length]);
      g.rows.push(...rows);
    } else groups.push({ key: value, name: value, spellings: [[value, rows.length]], rows: [...rows], people: 0 });
  }
  const none = byValue.get(NO_LEADER);
  if (none?.length) groups.push({ key: NO_LEADER, name: 'No leader listed', spellings: [], rows: none, people: 0 });
  for (const g of groups) {
    g.people = new Set(g.rows.map((r) => (nameColumn ? personKey(fieldValue(r, nameColumn)) : r.id))).size;
  }
  return groups.sort((a, b) => (a.key === NO_LEADER ? 1 : b.key === NO_LEADER ? -1 : a.name.localeCompare(b.name)));
}

export interface Visit {
  record: NormRecord;
  event: string;
  type: string;
  date: string;
  time: number | null;
  /** The leader as written on this row, when it differs from the group's main spelling. */
  leaderAs: string | null;
}

export interface Person {
  key: string;
  name: string;
  visits: Visit[];
  /** Distinct non-empty values per other column, in first-seen order. */
  details: [column: string, values: string[]][];
  firstVisit: number | null;
  lastVisit: number | null;
  variantRows: number;
}

export function parseDate(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  let m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(t);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(t);
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    // Excel's displayed format here is month/day; fall back to day/month when impossible.
    const [a, b] = [+m[1], +m[2]];
    return a > 12 ? Date.UTC(y, b - 1, a) : Date.UTC(y, a - 1, b);
  }
  const p = Date.parse(t);
  return Number.isNaN(p) ? null : p;
}

/** Everyone under one leader: one entry per person, with every visit. */
export function peopleIn(group: LeaderGroup, leaderColumn: string, roles: RosterRoles): Person[] {
  const skip = new Set([leaderColumn, roles.name, roles.event, roles.eventType, roles.date].filter(Boolean) as string[]);
  const people = new Map<string, Person & { spellings: Map<string, number> }>();
  for (const r of group.rows) {
    const rawName = roles.name ? fieldValue(r, roles.name) : '';
    const key = rawName ? personKey(rawName) : `row:${r.id}`;
    let p = people.get(key);
    if (!p) {
      p = { key, name: rawName || r.source, visits: [], details: [], firstVisit: null, lastVisit: null, variantRows: 0, spellings: new Map() };
      people.set(key, p);
    }
    if (rawName) p.spellings.set(rawName, (p.spellings.get(rawName) ?? 0) + 1);
    const leaderValue = cleanValue(fieldValue(r, leaderColumn));
    const leaderAs = group.key !== NO_LEADER && leaderValue !== group.name ? leaderValue : null;
    if (leaderAs) p.variantRows++;
    const date = fieldValue(r, roles.date);
    const time = parseDate(date);
    p.visits.push({ record: r, event: fieldValue(r, roles.event), type: fieldValue(r, roles.eventType), date, time, leaderAs });
    if (time !== null) {
      p.firstVisit = p.firstVisit === null ? time : Math.min(p.firstVisit, time);
      p.lastVisit = p.lastVisit === null ? time : Math.max(p.lastVisit, time);
    }
    for (const [k, v] of r.fields ?? []) {
      if (skip.has(k) || !v) continue;
      let entry = p.details.find(([c]) => c === k);
      if (!entry) p.details.push((entry = [k, []]));
      if (!entry[1].includes(v)) entry[1].push(v);
    }
  }
  const out: Person[] = [];
  for (const p of people.values()) {
    const { spellings, ...rest } = p;
    if (spellings.size) rest.name = [...spellings].sort((a, b) => b[1] - a[1])[0][0];
    rest.visits.sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
    out.push(rest);
  }
  return out;
}

export type PeopleSort = 'name' | 'visits' | 'recent';

export function sortPeople(people: Person[], sort: PeopleSort): Person[] {
  const byName = (a: Person, b: Person) => a.name.localeCompare(b.name);
  const s = [...people];
  if (sort === 'name') return s.sort(byName);
  if (sort === 'visits') return s.sort((a, b) => b.visits.length - a.visits.length || byName(a, b));
  return s.sort((a, b) => (b.lastVisit ?? -Infinity) - (a.lastVisit ?? -Infinity) || byName(a, b));
}

/**
 * Per-file leader index, built in the parsing worker so the page never walks
 * every row: for each leader-like column, the row positions per written value,
 * plus each row's person key.
 */
export interface LeaderIndex {
  byColumn: Record<string, [value: string, positions: number[]][]>;
  personKeys: string[] | null;
}

export function buildLeaderIndex(records: NormRecord[], columns: string[]): LeaderIndex {
  const leaderCols = leaderColumns(columns);
  const roles = rosterRoles(columns);
  const byColumn: LeaderIndex['byColumn'] = {};
  for (const col of leaderCols) {
    const tables = new Set<string>();
    for (const r of records) if (!tables.has(r.group) && r.fields?.some(([k]) => k === col)) tables.add(r.group);
    const byValue = new Map<string, number[]>();
    records.forEach((r, i) => {
      if (!r.fields || !tables.has(r.group)) return;
      const v = cleanValue(fieldValue(r, col));
      let list = byValue.get(v);
      if (!list) byValue.set(v, (list = []));
      list.push(i);
    });
    byColumn[col] = [...byValue];
  }
  const personKeys = roles.name && leaderCols.length ? records.map((r) => personKey(fieldValue(r, roles.name)) || `row:${r.id}`) : null;
  return { byColumn, personKeys };
}

/** Same result as groupLeaders, built from the workers' per-file indexes. */
export function groupLeadersIndexed(files: { records: NormRecord[]; leaders: LeaderIndex }[], leaderColumn: string): LeaderGroup[] {
  const byValue = new Map<string, { rows: NormRecord[]; keys: string[]; first: number }>();
  files.forEach((f, fi) => {
    for (const [value, positions] of f.leaders.byColumn[leaderColumn] ?? []) {
      let e = byValue.get(value);
      if (!e) byValue.set(value, (e = { rows: [], keys: [], first: fi * 1e9 + positions[0] }));
      for (const i of positions) {
        e.rows.push(f.records[i]);
        e.keys.push(f.leaders.personKeys?.[i] ?? `row:${f.records[i].id}`);
      }
    }
  });
  const values = [...byValue].filter(([v]) => v !== NO_LEADER).sort((a, b) => b[1].rows.length - a[1].rows.length || a[1].first - b[1].first);
  const groups: (LeaderGroup & { keys: Set<string> })[] = [];
  for (const [value, e] of values) {
    const g = groups.find((x) => sameLeader(x.name, value));
    if (g) {
      g.spellings.push([value, e.rows.length]);
      for (const r of e.rows) g.rows.push(r);
      for (const k of e.keys) g.keys.add(k);
    } else groups.push({ key: value, name: value, spellings: [[value, e.rows.length]], rows: [...e.rows], people: 0, keys: new Set(e.keys) });
  }
  const none = byValue.get(NO_LEADER);
  if (none?.rows.length) groups.push({ key: NO_LEADER, name: 'No leader listed', spellings: [], rows: none.rows, people: 0, keys: new Set(none.keys) });
  const out: LeaderGroup[] = groups.map(({ keys, ...g }) => ({ ...g, people: keys.size }));
  return out.sort((a, b) => (a.key === NO_LEADER ? 1 : b.key === NO_LEADER ? -1 : a.name.localeCompare(b.name)));
}
