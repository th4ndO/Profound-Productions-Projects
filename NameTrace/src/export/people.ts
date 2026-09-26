import type { LeaderGroup, Person, RosterRoles } from '../leaders/leaders';
import { buildCsvRows } from './csv';
import { buildTablePdf } from './pdf';

export interface PeopleExport {
  group: LeaderGroup;
  leaderColumn: string;
  roles: RosterRoles;
  people: Person[];
  headline: string;
  breakdown: string;
}

function visitsText(p: Person): string {
  return p.visits.map((v) => [v.event || 'Visit', v.type && `(${v.type})`, v.date && `on ${v.date}`, v.leaderAs && `[leader written “${v.leaderAs}”]`].filter(Boolean).join(' ')).join('; ');
}

function detail(p: Person, column: string | null): string {
  if (!column) return '';
  return p.details.find(([c]) => c === column)?.[1].join('; ') ?? '';
}

/** One row per person: name, visits, contact details, events, then any other columns. */
export function buildPeopleCsv(x: PeopleExport): string {
  const contact = [x.roles.mobile, x.roles.email, x.roles.address].filter(Boolean) as string[];
  const other: string[] = [];
  for (const p of x.people) for (const [c] of p.details) if (!contact.includes(c) && !other.includes(c)) other.push(c);
  const rows = [
    ['Name', x.leaderColumn, 'Visits', 'First visit', 'Last visit', ...contact, 'Events', 'Leader written differently', ...other],
    ...x.people.map((p) => {
      const dated = p.visits.filter((v) => v.date);
      return [
        p.name,
        x.group.name,
        String(p.visits.length),
        dated[0]?.date ?? '',
        dated[dated.length - 1]?.date ?? '',
        ...contact.map((c) => detail(p, c)),
        visitsText(p),
        p.variantRows ? String(p.variantRows) : '',
        ...other.map((c) => detail(p, c)),
      ];
    }),
  ];
  return buildCsvRows(rows);
}

export function buildPeoplePdf(x: PeopleExport): { bytes: ArrayBuffer; replaced: boolean } {
  return buildTablePdf({
    title: `People under ${x.group.name}`,
    headline: x.headline,
    breakdown: x.breakdown,
    head: ['Name', 'Visits', 'Contact', 'Events'],
    body: x.people.map((p) => [
      p.name,
      String(p.visits.length),
      [detail(p, x.roles.mobile), detail(p, x.roles.email), detail(p, x.roles.address)].filter(Boolean).join('\n'),
      visitsText(p),
    ]),
    columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 45 }, 2: { cellWidth: 200 }, 3: { cellWidth: 'auto' } },
  });
}

export function buildPeopleText(x: PeopleExport): string {
  const lines = [x.headline, x.breakdown, ''];
  x.people.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name} · ${p.visits.length} ${p.visits.length === 1 ? 'visit' : 'visits'}`);
    for (const c of [x.roles.mobile, x.roles.email, x.roles.address]) {
      const v = detail(p, c);
      if (v) lines.push(`   ${c}: ${v}`);
    }
    lines.push(`   Events: ${visitsText(p)}`);
    lines.push('');
  });
  return lines.join('\n').trimEnd() + '\n';
}
