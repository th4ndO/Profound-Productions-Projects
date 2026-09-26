import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';
import type { FileEntry } from '../state/fileStore';
import { Toggle } from './Toggle';

export interface FilterState {
  exactOnly: boolean;
  caseSensitive: boolean;
  scope: string; // 'all' or a file id
  field: string; // '' = all columns
}

const selectClass =
  'mt-1 w-full rounded-lg border border-edge bg-charcoal px-3 py-2 text-sm text-ink focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none';

export function Filters({
  state,
  onChange,
  files,
  columns,
  values,
  onPickValue,
}: {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  files: FileEntry[];
  columns: string[];
  values: [string, number][];
  onPickValue: (v: string) => void;
}) {
  const done = files.filter((f) => f.status === 'done');
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [open, setOpen] = useState(desktop);
  // Always open on wide screens, where the summary toggle is hidden.
  useEffect(() => {
    if (desktop) setOpen(true);
  }, [desktop]);
  return (
    <details
      className="group rounded-xl border border-edge bg-charcoal/60 lg:border-0 lg:bg-transparent"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-ink lg:hidden [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal aria-hidden className="size-4 text-mint" />
        Search options
        <span className="ml-auto text-xs font-normal text-muted group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs font-normal text-muted group-open:inline">Hide</span>
      </summary>
      <div className="space-y-4 px-4 pb-4 lg:px-0 lg:pb-0">
        <h2 className="hidden text-sm font-medium text-ink lg:block">Search options</h2>
        <Toggle label="Exact match only" hint="Only the name exactly as typed" checked={state.exactOnly} onChange={(v) => onChange({ exactOnly: v })} />
        <Toggle label="Case sensitive" hint="Capital letters must match" checked={state.caseSensitive} onChange={(v) => onChange({ caseSensitive: v })} />
        {done.length > 1 && (
          <div>
            <label htmlFor="nt-scope" className="text-sm text-ink">
              Search in
            </label>
            <select id="nt-scope" className={selectClass} value={state.scope} onChange={(e) => onChange({ scope: e.target.value, field: '' })}>
              <option value="all">All files ({done.length})</option>
              {done.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {columns.length > 0 && (
          <div>
            <label htmlFor="nt-field" className="text-sm text-ink">
              Column
            </label>
            <select id="nt-field" className={selectClass} value={state.field} onChange={(e) => onChange({ field: e.target.value })}>
              <option value="">All columns</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Only match names in this column of spreadsheets and tables.</p>
          </div>
        )}
        {state.field && values.length > 0 && values.length <= 40 && (
          <div>
            <p className="text-sm text-ink" id="nt-values-title">
              Names in “{state.field}”
            </p>
            <ul aria-labelledby="nt-values-title" className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-auto pr-1">
              {values.map(([v, n]) => (
                <li key={v}>
                  <button
                    type="button"
                    onClick={() => onPickValue(v)}
                    className="rounded-full border border-edge bg-surface px-2.5 py-1 text-left text-xs text-ink hover:border-accent hover:text-mint"
                  >
                    {v} <span className="text-muted">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
