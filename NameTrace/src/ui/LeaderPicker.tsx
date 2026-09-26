import { Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NO_LEADER, type LeaderGroup } from '../leaders/leaders';
import { fold } from '../match/normalize';
import { formatNumber } from './summary';

const selectClass =
  'mt-1 w-full rounded-lg border border-edge bg-charcoal px-3 py-2 text-sm text-ink focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none';

export function LeaderPicker({
  groups,
  columns,
  column,
  onColumn,
  selected,
  onSelect,
}: {
  groups: LeaderGroup[];
  columns: string[];
  column: string;
  onColumn: (c: string) => void;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const f = fold(filter.trim());
    if (!f) return groups;
    return groups.filter((g) => [g.name, ...g.spellings.map(([v]) => v)].some((n) => fold(n).includes(f)));
  }, [groups, filter]);

  return (
    <section aria-labelledby="nt-leaders-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="nt-leaders-title" className="text-sm font-medium text-ink">
          {column}
        </h2>
        <span className="text-xs text-muted">{groups.filter((g) => g.key !== NO_LEADER).length} leaders</span>
      </div>
      {columns.length > 1 && (
        <div className="mt-2">
          <label htmlFor="nt-leader-column" className="text-xs text-muted">
            Leader column
          </label>
          <select id="nt-leader-column" className={selectClass} value={column} onChange={(e) => onColumn(e.target.value)}>
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="relative mt-3">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <label htmlFor="nt-leader-filter" className="sr-only">
          Filter leaders
        </label>
        <input
          id="nt-leader-filter"
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter leaders"
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-edge bg-charcoal pr-3 pl-9 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
        />
      </div>
      <ul className="mt-2 max-h-[min(52vh,560px)] space-y-1 overflow-y-auto pr-1" aria-label={`Leaders in ${column}`}>
        {shown.map((g) => {
          const active = g.key === selected;
          const others = g.spellings.slice(1).map(([v]) => v);
          return (
            <li key={g.key || '__none'}>
              <button
                type="button"
                onClick={() => onSelect(g.key)}
                aria-pressed={active}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                  active ? 'border-accent bg-accent/15' : 'border-transparent hover:border-edge hover:bg-surface'
                }`}
              >
                <Users aria-hidden className={`size-4 shrink-0 ${active ? 'text-mint' : 'text-muted'}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${g.key === NO_LEADER ? 'text-muted italic' : 'text-ink'}`}>{g.name}</span>
                  {others.length > 0 && <span className="block truncate text-xs text-muted">Also written as {others.map((o) => `“${o}”`).join(', ')}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatNumber(g.people)} {g.people === 1 ? 'person' : 'people'}
                </span>
              </button>
            </li>
          );
        })}
        {!shown.length && <li className="px-3 py-2 text-sm text-muted">No leader matches “{filter}”.</li>}
      </ul>
    </section>
  );
}
