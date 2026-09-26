import { Compass, Search, ShieldCheck, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { groupLeadersIndexed, leaderColumns, peopleIn, rosterRoles, sortPeople } from './leaders/leaders';
import { parseQuery } from './match/query';
import { searchFiles, type SearchableFile } from './match/search';
import type { SearchHit, Unit } from './model/types';
import { createBrowserStore } from './state/fileStore';
import { Drawer } from './ui/Drawer';
import { DropZone } from './ui/DropZone';
import { NoFiles, NoFilesReadable, NoMatches, NoQuery, StillParsing } from './ui/EmptyState';
import { ExportBar, type ExportSource } from './ui/ExportBar';
import { LeaderPicker } from './ui/LeaderPicker';
import { PeopleView } from './ui/PeopleView';
import { FileList } from './ui/FileList';
import { Filters, type FilterState } from './ui/Filters';
import { Preview } from './ui/Preview';
import { ResultCard } from './ui/ResultCard';
import { SearchBox } from './ui/SearchBox';
import { Tour, type SampleState } from './ui/Tour';
import { formatNumber, plural, summarize } from './ui/summary';
import { useMediaQuery } from './ui/useMediaQuery';

const DEBOUNCE_MS = 140;
/** Sample files with invented names, served from this site for the tour. */
const SAMPLE_FILES = ['sample-roster.xlsx', 'sample-minutes.pdf', 'sample-report.docx', 'sample-notes.txt'];
const PAGE = 100;

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
  const [tourOpen, setTourOpen] = useState(false);
  const [samples, setSamples] = useState<SampleState>('idle');
  const tourButton = useRef<HTMLButtonElement>(null);
  const [modeChoice, setModeChoice] = useState<'leaders' | 'search' | null>(null);
  const [leaderColumnChoice, setLeaderColumnChoice] = useState('');
  const [leaderKey, setLeaderKey] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

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
        setModeChoice('search');
        // The search box renders after the mode switch.
        requestAnimationFrame(() => {
          searchRef.current?.focus();
          searchRef.current?.select();
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const done = useMemo(() => files.filter((f) => f.status === 'done'), [files]);
  const scopeValid = filters.scope === 'all' || done.some((f) => f.id === filters.scope);
  const scoped = useMemo(() => (scopeValid && filters.scope !== 'all' ? done.filter((f) => f.id === filters.scope) : done), [done, filters.scope, scopeValid]);

  // Column names and value counts come precomputed from the worker.
  const columns = useMemo(() => {
    const seen = new Set<string>();
    for (const f of scoped) for (const c of f.columns) seen.add(c.name);
    return [...seen];
  }, [scoped]);
  const field = columns.includes(filters.field) ? filters.field : '';

  const values = useMemo(() => {
    if (!field) return [] as [string, number][];
    const counts = new Map<string, number>();
    for (const f of scoped) for (const [v, n] of f.columns.find((c) => c.name === field)?.values ?? []) counts.set(v, (counts.get(v) ?? 0) + n);
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

  // Leader view: everyone under one leader, across all loaded spreadsheets.
  const allColumns = useMemo(() => {
    const seen = new Set<string>();
    for (const f of done) for (const c of f.columns) seen.add(c.name);
    return [...seen];
  }, [done]);
  const leaderCols = useMemo(() => leaderColumns(allColumns), [allColumns]);
  const leaderColumn = leaderCols.includes(leaderColumnChoice) ? leaderColumnChoice : (leaderCols[0] ?? '');
  const mode = leaderCols.length ? (modeChoice ?? 'leaders') : 'search';
  const roles = useMemo(() => rosterRoles(allColumns), [allColumns]);
  const leaderGroups = useMemo(
    () =>
      leaderColumn
        ? groupLeadersIndexed(
            done.filter((f) => f.leaders).map((f) => ({ records: f.records, leaders: f.leaders! })),
            leaderColumn,
          )
        : [],
    [done, leaderColumn],
  );
  const group = leaderKey === null ? null : (leaderGroups.find((g) => g.key === leaderKey) ?? null);
  const people = useMemo(() => (group ? sortPeople(peopleIn(group, leaderColumn, roles), 'name') : []), [group, leaderColumn, roles]);
  const leaderFiles = useMemo(() => new Set(group?.rows.map((r) => r.fileId) ?? []).size, [group]);
  const leaderSummary = group
    ? {
        headline: `${group.name}: ${plural(people.length, 'person', 'people')} under this ${leaderColumn === 'Leader at 1728' ? 'leader at 1728' : 'leader'}`,
        breakdown: [
          plural(group.rows.length, 'record', 'records'),
          leaderFiles > 1 ? `from ${leaderFiles} files` : '',
          group.spellings.length > 1
            ? `includes ${plural(group.spellings.slice(1).reduce((n, [, c]) => n + c, 0), 'record', 'records')} where the leader is written ${group.spellings
                .slice(1)
                .map(([v]) => `“${v}”`)
                .join(' or ')}`
            : '',
        ]
          .filter(Boolean)
          .join(' · '),
      }
    : null;

  const pickLeader = (key: string) => {
    setLeaderKey(key);
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  // The tour demonstrates the leader with the most people (spelling variants first, if any).
  const tourLeader = useMemo(() => {
    const real = leaderGroups.filter((g) => g.key !== '');
    return real.find((g) => g.spellings.length > 1) ?? [...real].sort((x, y) => y.people - x.people)[0] ?? null;
  }, [leaderGroups]);

  const exportSource = useMemo<ExportSource | null>(() => {
    if (mode === 'leaders') {
      if (!group || !leaderSummary) return null;
      const x = { group, leaderColumn, roles, people, headline: leaderSummary.headline, breakdown: leaderSummary.breakdown };
      return {
        id: `leader:${leaderColumn}:${group.key}:${people.length}`,
        count: people.length,
        noun: 'people',
        fileBase: `people under ${group.name}`,
        sampleText: () => people.slice(0, 5000).map((p) => p.name + p.details.map(([, v]) => v.join(' ')).join(' ')),
        csv: async () => (await import('./export/people')).buildPeopleCsv(x),
        pdf: async () => (await import('./export/people')).buildPeoplePdf(x).bytes,
        text: async () => (await import('./export/people')).buildPeopleText(x),
      };
    }
    if (!summary) return null;
    return {
      id: `search:${query}:${hits.length}:${filters.exactOnly}:${filters.caseSensitive}:${field}`,
      count: hits.length,
      noun: 'results',
      fileBase: query,
      sampleText: () => hits.slice(0, 5000).map((h) => h.record.text + h.record.fileName),
      csv: async () => (await import('./export/csv')).buildCsv(hits),
      pdf: async () => (await import('./export/pdf')).buildPdf(hits, query, summary.headline, summary.breakdown).bytes,
      text: async () => (await import('./export/copy')).buildPlainText(hits, summary.headline, summary.breakdown),
    };
    // leaderSummary is derived from group/people/leaderColumn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, group, people, leaderColumn, roles, summary, hits, query, filters.exactOnly, filters.caseSensitive, field]);

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

  const startTour = () => {
    setDrawerOpen(false);
    setTourOpen(true);
  };
  const closeTour = useCallback(() => {
    setTourOpen(false);
    tourButton.current?.focus();
  }, []);
  const loadSamples = async () => {
    setSamples('loading');
    try {
      const loaded = await Promise.all(
        SAMPLE_FILES.map(async (name) => {
          const res = await fetch(`${import.meta.env.BASE_URL}samples/${name}`);
          if (!res.ok) throw new Error(`${res.status}`);
          return new File([await res.blob()], name);
        }),
      );
      store.add(loaded);
      setSamples('done');
    } catch {
      setSamples('error');
    }
  };

  const parsing = files.filter((f) => f.status === 'parsing' || f.status === 'queued').length;
  const multiFile = scoped.length > 1;

  let body: ReactNode;
  if (!files.length) body = <NoFiles onStartTour={startTour} />;
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
              Showing {formatNumber(shown)} of {formatNumber(hits.length)}. Exports include all of them.
            </p>
          </div>
        )}
      </>
    );
  }

  const leaderMode = mode === 'leaders' && done.length > 0;
  if (leaderMode) {
    body = group ? (
      <PeopleView key={`${leaderColumn}:${group.key}`} group={group} people={people} roles={roles} showFiles={leaderFiles > 1} />
    ) : (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent/10 text-mint ring-1 ring-accent/25">
          <Users aria-hidden className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Choose a leader</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Pick a name from the {leaderColumn} list to see everyone under them, once each, with their contact details and every event they came to.
        </p>
        {parsing > 0 && <p className="mt-2 text-sm text-muted">Some files are still being read and will be added when ready.</p>}
      </div>
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
          <div className="flex items-center gap-3 sm:gap-5">
            <p className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted sm:text-sm">
              <ShieldCheck aria-hidden className="size-4 text-mint" />
              <span className="sm:hidden">Stays on device</span>
              <span className="hidden sm:inline">Files stay on this device</span>
            </p>
            <button
              ref={tourButton}
              type="button"
              onClick={startTour}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-mint sm:text-sm"
            >
              <Compass aria-hidden className="size-4 text-mint" />
              <span className="sm:hidden">Tour</span>
              <span className="hidden sm:inline">Take the tour</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:gap-8 lg:px-6">
        <aside aria-label="Files and search" className="contents lg:sticky lg:top-0 lg:block lg:max-h-dvh lg:space-y-6 lg:overflow-y-auto lg:py-6 lg:pr-1">
          <div className="order-1 pt-4 lg:pt-0" data-tour="add-files">
            <DropZone onFiles={(f) => store.add(f)} compact={files.length > 0} />
          </div>
          {leaderCols.length > 0 && done.length > 0 && (
            <div className="order-2" data-tour="mode">
              <div role="group" aria-label="View" className="grid grid-cols-2 gap-1 rounded-xl border border-edge bg-charcoal p-1">
                {(
                  [
                    ['leaders', 'Leaders', Users],
                    ['search', 'Find a person', Search],
                  ] as const
                ).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setModeChoice(m)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      mode === m ? 'bg-accent/20 text-mint' : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Icon aria-hidden className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {leaderMode && (
            <div className="order-2" data-tour="leaders">
              <LeaderPicker
                groups={leaderGroups}
                columns={leaderCols}
                column={leaderColumn}
                onColumn={(c) => {
                  setLeaderColumnChoice(c);
                  setLeaderKey(null);
                }}
                selected={leaderKey}
                onSelect={pickLeader}
              />
            </div>
          )}
          <div data-tour="search" hidden={leaderMode} className="sticky top-0 z-30 order-2 -mx-4 bg-obsidian/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <SearchBox ref={searchRef} value={input} onChange={setInput} onSubmit={() => runNow()} onClear={clear} listId={datalistId} />
            {datalistId && (
              <datalist id={datalistId}>
                {values.slice(0, 500).map(([v]) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            )}
          </div>
          <div className="order-3" data-tour="options" hidden={leaderMode}>
            <Filters state={{ ...filters, field }} onChange={patchFilters} files={files} columns={columns} values={values} onPickValue={(v) => runNow(v)} />
          </div>
          <div className="order-4" data-tour="export">
            <ExportBar source={exportSource} emptyHint={leaderMode ? 'Choose a leader to export their people.' : 'Search for a name to export what it finds.'} />
          </div>
          <div className="order-5" data-tour="files">
            <FileList
              files={files}
              onRemove={(id) => {
                store.remove(id);
                if (selectedHit?.record.fileId === id) setSelectedId(null);
              }}
            />
          </div>
        </aside>

        <main className={`order-6 min-w-0 pb-16 lg:py-6 ${files.length && !leaderMode ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] xl:gap-6' : ''}`}>
          <section ref={resultsRef} aria-labelledby="nt-results-title" className="min-w-0 scroll-mt-4" data-tour="results">
            <div className="mb-4">
              <h2 id="nt-results-title" className="text-base font-semibold text-balance text-ink" aria-live="polite">
                {leaderMode ? (leaderSummary ? leaderSummary.headline : 'People') : summary ? summary.headline : 'Results'}
              </h2>
              {leaderMode
                ? leaderSummary && <p className="mt-1 text-sm text-muted">{leaderSummary.breakdown}</p>
                : summary && <p className="mt-1 text-sm text-muted">{summary.breakdown}</p>}
            </div>
            {body}
          </section>
          <aside aria-labelledby="nt-preview-title" data-tour="preview" className={files.length && !leaderMode ? 'hidden xl:block' : 'hidden'}>
            <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-xl border border-edge bg-charcoal p-4">{wide && preview}</div>
          </aside>
        </main>
      </div>

      {tourOpen && (
        <Tour
          onClose={closeTour}
          hasFiles={files.length > 0}
          samples={samples}
          onLoadSamples={loadSamples}
          onTrySearch={() => {
            setModeChoice('search');
            runNow('Sarah Connor');
          }}
          onPickLeader={() => {
            setModeChoice('leaders');
            if (tourLeader) setLeaderKey(tourLeader.key);
          }}
          hasLeaders={leaderGroups.length > 0}
          leaderName={tourLeader?.name ?? null}
          wide={wide}
        />
      )}

      <Drawer open={drawerOpen && !wide && !!selectedHit} onClose={closeDrawer} labelledBy="nt-preview-title">
        {!wide && preview}
      </Drawer>
    </div>
  );
}
