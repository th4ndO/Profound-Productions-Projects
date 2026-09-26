import { Check, ChevronLeft, ChevronRight, Search, Upload, Users, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Spinner } from './Spinner';
import { useMediaQuery } from './useMediaQuery';

export type SampleState = 'idle' | 'loading' | 'done' | 'error';

interface Step {
  id: string;
  /** Value of the data-tour attribute to highlight. None: a centred card. */
  target?: string;
  title: string;
  body: ReactNode;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GAP = 12;
const EDGE = 16;

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/** The target's box, clipped to the viewport; null when it is missing or hidden. */
function measure(target: string | undefined): Rect | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el || !el.getClientRects().length) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const top = Math.max(r.top, 0);
  const bottom = Math.min(r.bottom, window.innerHeight);
  if (bottom - top < 8) return null;
  return { top: Math.round(top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(bottom - top) };
}

function place(rect: Rect | null, w: number, h: number, vw: number, vh: number): React.CSSProperties {
  const clampLeft = (x: number) => Math.min(Math.max(x, EDGE), vw - w - EDGE);
  const clampTop = (y: number) => Math.min(Math.max(y, EDGE), vh - h - EDGE);
  if (!rect) return { left: clampLeft((vw - w) / 2), top: clampTop((vh - h) / 2) };
  if (rect.left + rect.width + GAP + w <= vw - EDGE) return { left: rect.left + rect.width + GAP, top: clampTop(rect.top) };
  if (rect.top + rect.height + GAP + h <= vh - EDGE) return { left: clampLeft(rect.left), top: rect.top + rect.height + GAP };
  if (rect.top - GAP - h >= EDGE) return { left: clampLeft(rect.left), top: rect.top - GAP - h };
  if (rect.left - GAP - w >= EDGE) return { left: rect.left - GAP - w, top: clampTop(rect.top) };
  return { left: clampLeft((vw - w) / 2), top: vh - h - EDGE }; // overlaps the target; sit at the bottom
}

const action =
  'inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-obsidian hover:bg-mint disabled:cursor-not-allowed disabled:opacity-60';

export function Tour({
  onClose,
  hasFiles,
  samples,
  onLoadSamples,
  onTrySearch,
  onPickLeader,
  hasLeaders,
  leaderName,
  wide,
}: {
  onClose: () => void;
  hasFiles: boolean;
  samples: SampleState;
  onLoadSamples: () => void;
  onTrySearch: () => void;
  onPickLeader: () => void;
  hasLeaders: boolean;
  leaderName: string | null;
  wide: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [size, setSize] = useState({ w: 360, h: 220 });
  const [viewport, setViewport] = useState({ vw: window.innerWidth, vh: window.innerHeight });
  const card = useRef<HTMLDivElement>(null);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');

  const steps: Step[] = [
    {
      id: 'welcome',
      title: 'Welcome to NameTrace',
      body: (
        <>
          <p>Load a roster export, pick a leader at 1728, and see everyone under them: once each, with their contact details and every event they came to.</p>
          <p className="mt-2">You can also find any person by name across PDFs, Word files, spreadsheets and text files.</p>
          <p className="mt-2">Your files never leave this device. They are read in your browser, and nothing is uploaded or saved.</p>
          <p className="mt-2 text-muted">Use the arrow keys or the buttons to move, and Esc to close.</p>
        </>
      ),
    },
    {
      id: 'add-files',
      target: 'add-files',
      title: 'Add your roster',
      body: (
        <>
          <p>Drop your roster export here, or select the box to choose it. Excel (.xlsx or .xls), CSV and other files work, and you can add several at once.</p>
          {samples === 'done' ? (
            <p className="mt-3 flex items-center gap-2 text-mint">
              <Check aria-hidden className="size-4" /> Sample files added. Select Next.
            </p>
          ) : !hasFiles || samples !== 'idle' ? (
            <div className="mt-3">
              <p className="mb-2 text-muted">No file handy? Try it with a sample roster that uses made-up names.</p>
              <button type="button" className={action} onClick={onLoadSamples} disabled={samples === 'loading'}>
                {samples === 'loading' ? <Spinner /> : <Upload aria-hidden className="size-4" />}
                {samples === 'loading' ? 'Loading samples…' : 'Load sample files'}
              </button>
              {samples === 'error' && <p className="mt-2 text-red-200">The sample files couldn’t be loaded. Add your own files instead.</p>}
            </div>
          ) : null}
        </>
      ),
    },
    {
      id: 'leaders',
      target: 'leaders',
      title: 'Choose a leader at 1728',
      body: hasLeaders ? (
        <>
          <p>Every leader in the Leader at 1728 column is listed with how many people they have. Type in the filter box to find one quickly.</p>
          <p className="mt-2">If a leader’s name is written in different ways, the spellings are grouped and shown as “Also written as…”.</p>
          <button type="button" className={`${action} mt-3`} onClick={onPickLeader}>
            <Users aria-hidden className="size-4" />
            Show {leaderName ? `${leaderName}’s` : 'a leader’s'} people
          </button>
        </>
      ) : (
        <p>Once a roster with a “Leader at 1728” column is loaded, every leader appears here with how many people they have. Add a roster, or load the sample files.</p>
      ),
    },
    {
      id: 'people',
      target: 'results',
      title: 'Everyone under that leader',
      body: (
        <>
          <p>Each person appears once, even if they came to several events, with their phone number, email, address and every visit with its date.</p>
          <p className="mt-2">
            A{' '}
            <span className="rounded-full bg-warn/10 px-2 py-0.5 text-xs text-amber-200 outline-1 -outline-offset-1 outline-warn/60 outline-dashed">Leader written “…”</span> mark
            shows a visit where the leader’s name was spelled differently, so you can check it.
          </p>
          <p className="mt-2 text-muted">Use “Find someone in this list” and “Sort by” above the cards to narrow it down.</p>
        </>
      ),
    },
    {
      id: 'export',
      target: 'export',
      title: 'Export the list',
      body: (
        <ul className="space-y-2">
          <li>
            <strong className="font-semibold text-ink">CSV</strong> gives one row per person with their contact details and visits, ready for Excel.
          </li>
          <li>
            <strong className="font-semibold text-ink">PDF</strong> makes a printable list for the leader.
          </li>
          <li>
            <strong className="font-semibold text-ink">Copy all</strong> puts a plain-text list on your clipboard, ready to paste into a message.
          </li>
        </ul>
      ),
    },
    {
      id: 'mode',
      target: hasLeaders ? 'mode' : 'search',
      title: 'Find a person',
      body: (
        <>
          <p>Switch to “Find a person” to search for anyone by name across all your files, including PDFs and Word documents.</p>
          <p className="mt-2">It also finds “Connor, Sarah”, “S. Connor”, emails like sarah.connor@… and likely typos, each marked so you know how it matched.</p>
          {hasFiles && (
            <button type="button" className={`${action} mt-3`} onClick={onTrySearch}>
              <Search aria-hidden className="size-4" />
              Search for “Sarah Connor”
            </button>
          )}
        </>
      ),
    },
    {
      id: 'results',
      target: 'results',
      title: 'Read the search results',
      body: (
        <>
          <p>Each result says where it was found and how it matched:</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <mark className="hl font-serif">Sarah Connor</mark> <span className="text-muted">Exact</span>
            </li>
            <li>
              <mark className="hl font-serif">Connor, Sarah</mark> <span className="text-muted">Name variant</span>
            </li>
            <li>
              <mark className="hl-fuzzy font-serif">Sarah Conner</mark> <span className="text-muted">Possible typo: worth checking</span>
            </li>
          </ul>
          <p className="mt-2 text-muted">{wide ? 'Select a result’s title to see it in context on the right.' : 'Select a result’s title to see it in context.'}</p>
        </>
      ),
    },
    {
      id: 'files',
      target: 'files',
      title: 'Check your files',
      body: <p>Each file shows its progress and anything that needs attention, such as an empty sheet or a scanned PDF that needs text recognition (OCR). Select ✕ to remove a file.</p>,
    },
    {
      id: 'done',
      title: 'You’re ready',
      body: (
        <>
          <p>Closing the tab clears everything you added. Nothing is kept.</p>
          <p className="mt-2">Take this tour again any time with “Take the tour” at the top of the page.</p>
        </>
      ),
    },
  ];

  const step = steps[index];
  const last = index === steps.length - 1;
  const next = useCallback(() => (last ? onClose() : setIndex((i) => i + 1)), [last, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Bring the highlighted part into view, then follow it (smooth scrolling,
  // sticky panels and resizes all move it).
  useEffect(() => {
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    // Centre it: at the top of a phone screen the pinned search bar would cover it.
    el?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    let frame = 0;
    let prev: Rect | null = null;
    const tick = () => {
      const r = measure(step.target);
      if (!sameRect(r, prev)) {
        prev = r;
        setRect(r);
      }
      setViewport((v) => (v.vw === window.innerWidth && v.vh === window.innerHeight ? v : { vw: window.innerWidth, vh: window.innerHeight }));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [step.target, reduced]);

  useLayoutEffect(() => {
    const c = card.current;
    if (!c) return;
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
  });

  // Move focus to the card on each step so screen readers announce it.
  useEffect(() => {
    card.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      } else if (e.key === 'Tab' && card.current) {
        const f = card.current.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!f.length) return;
        const first = f[0];
        const lastEl = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === card.current)) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [next, back, onClose]);

  const pos = place(rect, size.w, size.h, viewport.vw, viewport.vh);
  const pad = 6;

  return (
    <div className="fixed inset-0 z-[70]" data-testid="tour">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-xl transition-[top,left,width,height] duration-200 motion-reduce:transition-none"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            // One box-shadow list: the mint outline, the dimmed page, then a soft glow.
            // (A ring-* class would be overwritten, since rings are box-shadows too.)
            boxShadow: '0 0 0 2px var(--color-mint), 0 0 0 9999px rgb(9 13 11 / 0.72), 0 0 24px color-mix(in oklab, var(--color-mint) 35%, transparent)',
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-obsidian/72" />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nt-tour-title"
        aria-describedby="nt-tour-body"
        tabIndex={-1}
        className="fixed w-[min(360px,calc(100vw-32px))] rounded-2xl border border-edge bg-charcoal p-5 text-sm leading-relaxed text-ink/90 shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-mint"
        style={pos}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-mint">
            Step {index + 1} of {steps.length}
          </p>
          <button type="button" onClick={onClose} aria-label="Close the tour" className="-mt-1 -mr-2 grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <h2 id="nt-tour-title" className="text-base font-semibold text-ink">
          {step.title}
        </h2>
        <div id="nt-tour-body" className="mt-2">
          {step.body}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div aria-hidden className="flex gap-1">
            {steps.map((s, i) => (
              <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-mint' : 'w-1.5 bg-edge'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-lg border border-edge px-3 py-2 text-sm font-medium text-ink hover:border-accent">
                <ChevronLeft aria-hidden className="size-4" />
                Back
              </button>
            )}
            <button type="button" onClick={next} className="inline-flex items-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-sm font-semibold text-mint hover:bg-accent/25">
              {last ? 'Finish' : index === 0 ? 'Start' : 'Next'}
              {!last && <ChevronRight aria-hidden className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
