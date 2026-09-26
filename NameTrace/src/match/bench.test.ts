import { describe, expect, it } from 'vitest';
import { fieldsToText } from '../model/fields';
import type { FieldPair, NormRecord } from '../model/types';
import { buildIndex, searchFiles } from './search';

// Deterministic pseudo-random generator so runs are comparable.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const FIRST = ['Sarah', 'John', 'Thabo', 'Lerato', 'José', 'Anna', 'Pieter', 'Nomsa', 'David', 'Zanele', 'Kyle', 'Aisha', 'Sipho', 'Megan', 'Tariq', 'Refilwe'];
const LAST = ['Connor', 'Smith', 'Nkosi', 'Dlamini', 'Álvarez', 'van der Merwe', 'Mokoena', 'Naidoo', 'Botha', 'Khumalo', 'Pillay', 'Jacobs', 'Mahlangu', 'Cannon', 'Conner', 'Coetzee'];
const WORDS = 'the meeting was held on tuesday and notes were shared with everyone who attended including follow up actions budget venue transport children youth outreach prayer worship'.split(' ');

function makeRecords(n: number): NormRecord[] {
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const name = () => `${pick(FIRST)} ${pick(LAST)}`;
  const records: NormRecord[] = [];
  for (let i = 0; i < n; i++) {
    const base = { id: `b:${i}`, fileId: 'b', fileName: 'bench', index: i, group: 'Sheet 1', source: `Row ${i + 2}` };
    if (i % 2 === 0) {
      const fields: FieldPair[] = [
        ['Full Name', name()],
        ['Leader at 1728', name()],
        ['Address', `${Math.floor(r() * 900) + 10} ${pick(WORDS)} street`],
        ['Mobile Number', `08${Math.floor(r() * 1e8)}`],
        ['Email', `${pick(FIRST).toLowerCase()}.${pick(LAST).toLowerCase().replace(/ /g, '')}@example.com`],
        ['Event Name', `${pick(WORDS)} ${pick(WORDS)}`],
      ];
      records.push({ ...base, kind: 'record', text: fieldsToText(fields), fields });
    } else {
      const words = Array.from({ length: 18 }, () => pick(WORDS));
      words.splice(Math.floor(r() * 18), 0, name());
      records.push({ ...base, kind: 'text', text: words.join(' ') + '.', fields: null });
    }
  }
  return records;
}

function percentile(xs: number[], p: number) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

describe('search performance (50k records)', () => {
  it('keeps p95 under 100 ms per keystroke', () => {
    const records = makeRecords(50_000);
    let t = performance.now();
    const file = { records, index: buildIndex(records) };
    const indexMs = performance.now() - t;

    // Every prefix of each query, like typing it.
    const queries = ['Sarah Connor', 'Connor, Sarah', 'José Alvarez', 'Nkosi', 'Lerato van der Merwe'];
    const prefixes = queries.flatMap((q) => Array.from({ length: q.length }, (_, i) => q.slice(0, i + 1)));
    const report: string[] = [`index build: ${indexMs.toFixed(0)} ms, ${file.index.size} distinct tokens`];
    for (const exactOnly of [false, true]) {
      // Cold pass (first time each record's tokens are used) then a timed warm pass.
      const cold: number[] = [];
      for (const q of prefixes) {
        t = performance.now();
        searchFiles([file], q, { exactOnly, caseSensitive: false });
        cold.push(performance.now() - t);
      }
      const warm: number[] = [];
      let hits = 0;
      for (const q of prefixes) {
        t = performance.now();
        hits = searchFiles([file], q, { exactOnly, caseSensitive: false }).length;
        warm.push(performance.now() - t);
      }
      const mode = exactOnly ? 'exact' : 'smart';
      report.push(
        `${mode}: ${prefixes.length} keystrokes · p50 ${percentile(warm, 50).toFixed(1)} ms · p95 ${percentile(warm, 95).toFixed(1)} ms · max ${Math.max(...warm).toFixed(1)} ms · cold max ${Math.max(...cold).toFixed(1)} ms · last query hits ${hits}`,
      );
      const slow = prefixes.map((q, i) => [q, warm[i]] as const).filter(([, ms]) => ms > 30).map(([q, ms]) => `"${q}" ${ms.toFixed(0)}ms`);
      if (slow.length) report.push(`${mode} slowest: ${slow.join(", ")}`);
      expect(percentile(warm, 95)).toBeLessThan(100);
    }
    console.log('\n[bench] ' + report.join('\n[bench] '));
  }, 120_000);
});
