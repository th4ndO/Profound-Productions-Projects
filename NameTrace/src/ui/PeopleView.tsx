import { AlertTriangle, CalendarDays, Mail, MapPin, Phone } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { NO_LEADER, sortPeople, type LeaderGroup, type PeopleSort, type Person, type RosterRoles } from '../leaders/leaders';
import { fold } from '../match/normalize';
import { formatNumber, plural } from './summary';

const PAGE = 100;

function telHref(v: string) {
  return `tel:${v.replace(/[^\d+]/g, '')}`;
}

const PersonCard = memo(function PersonCard({ person, roles, showFiles }: { person: Person; roles: RosterRoles; showFiles: boolean }) {
  const get = (c: string | null) => (c ? (person.details.find(([k]) => k === c)?.[1] ?? []) : []);
  const contact = new Set([roles.mobile, roles.email, roles.address]);
  const others = person.details.filter(([k]) => !contact.has(k));
  return (
    <article className="rounded-xl border border-edge bg-charcoal p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-serif text-lg text-ink">{person.name}</h3>
        <span className="text-xs text-muted">{plural(person.visits.length, 'visit', 'visits')}</span>
      </header>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {get(roles.mobile).map((v) => (
          <li key={v}>
            <a href={telHref(v)} className="inline-flex items-center gap-1.5 rounded text-ink/90 hover:text-mint">
              <Phone aria-hidden className="size-3.5 text-mint" />
              <span className="sr-only">Phone: </span>
              {v}
            </a>
          </li>
        ))}
        {get(roles.email).map((v) => (
          <li key={v} className="min-w-0">
            <a href={`mailto:${v}`} className="inline-flex max-w-full items-center gap-1.5 rounded break-all text-ink/90 hover:text-mint">
              <Mail aria-hidden className="size-3.5 shrink-0 text-mint" />
              <span className="sr-only">Email: </span>
              {v}
            </a>
          </li>
        ))}
        {get(roles.address).map((v) => (
          <li key={v} className="inline-flex items-center gap-1.5 text-ink/90">
            <MapPin aria-hidden className="size-3.5 shrink-0 text-mint" />
            <span className="sr-only">Address: </span>
            {v}
          </li>
        ))}
      </ul>
      <ol className="mt-3 space-y-1 border-l border-edge pl-3" aria-label={`Visits by ${person.name}`}>
        {person.visits.map((v) => (
          <li key={v.record.id} className="text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <CalendarDays aria-hidden className="size-3.5" />
              {v.date || 'No date'}
            </span>{' '}
            <span className="font-serif text-ink/90">{v.event || v.record.source}</span>
            {v.type && <span className="text-muted"> · {v.type}</span>}
            {showFiles && <span className="text-muted"> · {v.record.fileName}</span>}
            {v.leaderAs && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-xs text-amber-200 outline-1 -outline-offset-1 outline-warn/60 outline-dashed">
                <AlertTriangle aria-hidden className="size-3" />
                Leader written “{v.leaderAs}”
              </span>
            )}
          </li>
        ))}
      </ol>
      {others.length > 0 && (
        <dl className="mt-3 grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-1 text-xs">
          {others.map(([k, vals]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="text-ink/80">{vals.join('; ')}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
});

export function PeopleView({ group, people, roles, showFiles }: { group: LeaderGroup; people: Person[]; roles: RosterRoles; showFiles: boolean }) {
  const [sort, setSort] = useState<PeopleSort>('name');
  const [filter, setFilter] = useState('');
  const [shown, setShown] = useState(PAGE);
  const list = useMemo(() => {
    const f = fold(filter.trim());
    const sorted = sortPeople(people, sort);
    return f ? sorted.filter((p) => fold(p.name).includes(f)) : sorted;
  }, [people, sort, filter]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="nt-people-filter" className="text-xs text-muted">
            Find someone in this list
          </label>
          <input
            id="nt-people-filter"
            type="search"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Type a name"
            autoComplete="off"
            className="mt-1 h-10 w-full rounded-lg border border-edge bg-charcoal px-3 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="nt-people-sort" className="text-xs text-muted">
            Sort by
          </label>
          <select
            id="nt-people-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as PeopleSort)}
            className="mt-1 h-10 rounded-lg border border-edge bg-charcoal px-3 text-sm text-ink focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
          >
            <option value="name">Name</option>
            <option value="visits">Most visits</option>
            <option value="recent">Latest visit</option>
          </select>
        </div>
      </div>
      {group.key === NO_LEADER && <p className="mb-3 text-sm text-muted">These rows have an empty leader column.</p>}
      <ol className="space-y-3" aria-label={`People under ${group.name}`}>
        {list.slice(0, shown).map((p) => (
          <li key={p.key}>
            <PersonCard person={p} roles={roles} showFiles={showFiles} />
          </li>
        ))}
      </ol>
      {!list.length && <p className="py-8 text-center text-sm text-muted">Nobody here matches “{filter}”.</p>}
      {list.length > shown && (
        <div className="mt-4 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="rounded-lg border border-edge bg-charcoal px-4 py-2 text-sm font-medium text-ink hover:border-accent hover:text-mint"
          >
            Show {Math.min(PAGE, list.length - shown)} more
          </button>
          <p className="text-xs text-muted">
            Showing {formatNumber(shown)} of {formatNumber(list.length)}. Exports include everyone.
          </p>
        </div>
      )}
    </div>
  );
}
