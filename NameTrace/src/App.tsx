import { ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { parseQuery } from './match/query';
import { searchFiles, type SearchableFile } from './match/search';
import type { SearchHit, Unit } from './model/types';
import { createBrowserStore } from './state/fileStore';
import { Drawer } from './ui/Drawer';
import { DropZone } from './ui/DropZone';
import { NoFiles, NoFilesReadable, NoMatches, NoQuery, StillParsing } from './ui/EmptyState';
import { ExportBar } from './ui/ExportBar';
import { FileList } from './ui/FileList';
import { Filters, type FilterState } from './ui/Filters';
import { Preview } from './ui/Preview';
import { ResultCard } from './ui/ResultCard';
import { SearchBox } from './ui/SearchBox';
import { summarize } from './ui/summary';
import { useMediaQuery } from './ui/useMediaQuery';

const DEBOUNCE_MS = 140;
const PAGE = 200;

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

function Suggestion({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded font-medium text-mint underline decoration-mint/40 underline-offset-2 hover:decoration-mint">
      {children}
    </button>
  );
}

export default function App() {
  const store = useMemo(() => createBrowserStore(), []);
  const files = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ exactOnly: false, caseSensitive: false, scope: 'all', field: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const wide = useMediaQuery('(min-width: 1280px)');

  // Live filtering with a short debounce; Enter applies at once.
  useEffect(() => {
    if (input === query) return;
    const t = setTimeout(() => setQuery(input), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input, query]);

  // "/" and Ctrl/Cmd+K focus the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !isEditable(document.activeElement))) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const done = useMemo(() => files.filter((f) => f.status === 'done'), [files]);
  const scopeValid = filters.scope === 'all' || done.some((f) => f.id === filters.scope);
  const scoped = useMemo(() => (scopeValid && filters.scope !== 'all' ? done.filter((f) => f.id === filters.scope) : done), [done, filters.scope, scopeValid]);

  const columns = useMemo(() => {
    const seen = new Set<string>();
    for (const f of scoped) for (const r of f.records) if (r.fields) for (const [k] of r.fields) seen.add(k);
    return [...seen];
  }, [scoped]);
  const field = columns.includes(filters.field) ? filters.field : '';

  const values = useMemo(() => {
    if (!field) return [] as [string, number][];
    const counts = new Map<string, number>();
    for (const f of scoped)
      for (const r of f.records) {
        if (!r.fields) continue;
        for (const [k, v] of r.fields) if (k === field) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [scoped, field]);

  const searchable = useMemo<SearchableFile[]>(() => scoped.map((f) => ({ records: f.records, index: f.index! })), [scoped]);
  const hits = useMemo<SearchHit[]>(
    () => (query.trim() ? searchFiles(searchable, query, { exactOnly: filters.exactOnly, caseSensitive: filters.caseSensitive, field }) : []),
    [searchable, query, filters.exactOnly, filters.caseSensitive, field],
  );
  const hitsById = useMemo(() => new Map(hits.map((h) => [h.record.id, h])), [hits]);
  const units = useMemo(() => new Map<string, Unit>(done.map((f) => [f.id, f.unit!])), [done]);
  const summary = useMemo(() => (hits.length ? summarize(hits, units, query) : null), [hits, units, query]);

  // A new search starts at the top with nothing selected.
  useEffect(() => {
    setShown(PAGE);
    setSelectedId(null);
  }, [query, filters.exactOnly, filters.caseSensitive, field, filters.scope]);

  const selectedHit = selectedId ? (hitsById.get(selectedId) ?? null) : null;
  const previewFile = selectedHit ? (done.find((f) => f.id === selectedHit.record.fileId) ?? null) : (scoped[0] ?? null);

  const onSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!wide) setDrawerOpen(true);
    },
    [wide],
  );
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const clear = () => {
    setInput('');
    setQuery('');
    searchRef.current?.focus();
  };
  const runNow = (v = input) => {
    setInput(v);
    setQuery(v);
  };
  const patchFilters = (p: Partial<FilterState>) => setFilters((f) => ({ ...f, ...p }));

  const parsing = files.filter((f) => f.status === 'parsing' || f.status === 'queued').length;
  const multiFile = scoped.length > 1;

  let body: ReactNode;
  if (!files.length) body = <NoFiles />;
  else if (!done.length && parsing) body = <StillParsing count={parsing} />;
  else if (!done.length) body = <NoFilesReadable />;
  else if (!query.trim())
    body = (
      <>
        <NoQuery records={scoped.reduce((n, f) => n + f.records.length, 0)} files={scoped.length} />
        {parsing > 0 && (
          <p className="text-center text-sm text-muted">
            {parsing === 1 ? 'One more file is' : `${parsing} more files are`} still being read and will be included when ready.
          </p>
        )}
      </>
    );
  else if (!hits.length) {
    const s: ReactNode[] = [];
    if (filters.exactOnly)
      s.push(
        <>
          <Suggestion onClick={() => patchFilters({ exactOnly: false })}>Turn off Exact match only</Suggestion> to include “Connor, Sarah”, initials and likely typos.
        </>,
      );
    if (filters.caseSensitive)
      s.push(
        <>
          <Suggestion onClick={() => patchFilters({ caseSensitive: false })}>Turn off Case sensitive</Suggestion> so capital letters don’t have to match.
        </>,
      );
    if (field)
      s.push(
        <>
          <Suggestion onClick={() => patchFilters({ field: '' })}>Search all columns</Suggestion> instead of only “{field}”.
        </>,
      );
    if (filters.scope !== 'all' && done.length > 1)
      s.push(
        <>
          <Suggestion onClick={() => patchFilters({ scope: 'all' })}>Search all {done.length} files</Suggestion>.
        </>,
      );
    const parts = parseQuery(query)?.parts ?? [];
    if (parts.length > 1 && !filters.exactOnly) {
      const surname = query.includes(',') ? query.split(',')[0].trim() : query.trim().split(/\s+/).pop()!;
      s.push(
        <>
          Try only the surname: <Suggestion onClick={() => runNow(surname)}>{surname}</Suggestion>.
        </>,
      );
    }
    s.push(<>Check the spelling, or try a shorter part of the name.</>);
    if (parsing) s.push(<>Some files are still being read. They’ll be searched when ready.</>);
    body = <NoMatches query={query} suggestions={s} />;
  } else {
    body = (
      <>
        <ol className="space-y-3" aria-label="Results">
          {hits.slice(0, shown).map((h) => (
            <li key={h.record.id}>
              <ResultCard hit={h} showFile={multiFile} selected={h.record.id === selectedId} onSelect={onSelect} />
            </li>
          ))}
        </ol>
        {hits.length > shown && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="rounded-lg border border-edge bg-charcoal px-4 py-2 text-sm font-medium text-ink hover:border-accent hover:text-mint"
            >
              Show {Math.min(PAGE, hits.length - shown)} more
            </button>
            <p className="text-xs text-muted">
              Showing {shown.toLocaleString('en-ZA')} of {hits.length.toLocaleString('en-ZA')}. Exports include all of them.
            </p>
          </div>
        )}
      </>
    );
  }

  const preview = <Preview hit={selectedHit} file={previewFile} hitsById={hitsById} headingId="nt-preview-title" />;
  const datalistId = field && values.length > 40 ? 'nt-values' : undefined;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-edge/70 bg-charcoal/60">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-8" />
            <h1 className="text-lg font-semibold tracking-tight text-ink">NameTrace</h1>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted sm:text-sm">
            <ShieldCheck aria-hidden className="size-4 text-mint" />
            Files stay on this device
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:gap-8 lg:px-6">
        <aside aria-label="Files and search" className="contents lg:sticky lg:top-0 lg:block lg:max-h-dvh lg:space-y-6 lg:overflow-y-auto lg:py-6 lg:pr-1">
          <div className="order-1 pt-4 lg:pt-0">
            <DropZone onFiles={(f) => store.add(f)} compact={files.length > 0} />
          </div>
          <div className="sticky top-0 z-30 order-2 -mx-4 bg-obsidian/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <SearchBox ref={searchRef} value={input} onChange={setInput} onSubmit={() => runNow()} onClear={clear} listId={datalistId} />
            {datalistId && (
              <datalist id={datalistId}>
                {values.slice(0, 500).map(([v]) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            )}
          </div>
          <div className="order-3">
            <Filters state={{ ...filters, field }} onChange={patchFilters} files={files} columns={columns} values={values} onPickValue={(v) => runNow(v)} />
          </div>
          <div className="order-4">
            <FileList
              files={files}
              onRemove={(id) => {
                store.remove(id);
                if (selectedHit?.record.fileId === id) setSelectedId(null);
              }}
            />
          </div>
          <div className="order-5">
            <ExportBar hits={hits} query={query} summary={summary} />
          </div>
        </aside>

        <main className={`order-6 min-w-0 pb-16 lg:py-6 ${files.length ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] xl:gap-6' : ''}`}>
          <section aria-labelledby="nt-results-title" className="min-w-0">
            <div className="mb-4">
              <h2 id="nt-results-title" className="text-base font-semibold text-balance text-ink" aria-live="polite">
                {summary ? summary.headline : 'Results'}
              </h2>
              {summary && <p className="mt-1 text-sm text-muted">{summary.breakdown}</p>}
            </div>
            {body}
          </section>
          <aside aria-labelledby="nt-preview-title" className={files.length ? 'hidden xl:block' : 'hidden'}>
            <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-xl border border-edge bg-charcoal p-4">{wide && preview}</div>
          </aside>
        </main>
      </div>

      <Drawer open={drawerOpen && !wide && !!selectedHit} onClose={closeDrawer} labelledBy="nt-preview-title">
        {!wide && preview}
      </Drawer>
    </div>
  );
}
