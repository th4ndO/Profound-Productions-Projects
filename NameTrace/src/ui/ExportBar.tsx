import { Check, Copy, FileDown, FileSpreadsheet } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { needsUnicodeFont } from '../export/pdfText';
import { Spinner } from './Spinner';
import { formatNumber } from './summary';

/** What the export buttons export: search results or a leader's people. */
export interface ExportSource {
  /** Changes whenever the exported content changes. */
  id: string;
  count: number;
  /** Used in button labels, e.g. "results" or "people". */
  noun: string;
  fileBase: string;
  /** Text to check for characters the PDF fonts can't draw. */
  sampleText: () => string[];
  csv: () => Promise<string>;
  pdf: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
}

const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-edge bg-charcoal px-3 py-2 text-sm font-medium text-ink hover:border-accent hover:text-mint disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-edge disabled:hover:text-ink';

export function ExportBar({ source, emptyHint }: { source: ExportSource | null; emptyHint: string }) {
  const [busy, setBusy] = useState<'csv' | 'pdf' | 'copy' | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const disabled = !source || source.count === 0;
  const nonLatin = useMemo(() => (source ? needsUnicodeFont(source.sampleText()) : false), [source]);
  const noun = source?.noun ?? 'results';

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setCopied(false);
    setMessage('');
  }, [source?.id]);

  const flash = (text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMessage('');
      setCopied(false);
    }, 2500);
  };

  const run = async (kind: 'csv' | 'pdf' | 'copy') => {
    if (!source) return;
    setBusy(kind);
    try {
      const { download, fileNameFor } = await import('../export/common');
      if (kind === 'csv') {
        download(await source.csv(), 'text/csv;charset=utf-8', fileNameFor(source.fileBase, 'csv'));
        flash('CSV downloaded');
      } else if (kind === 'pdf') {
        download(await source.pdf(), 'application/pdf', fileNameFor(source.fileBase, 'pdf'));
        flash('PDF downloaded');
      } else {
        const { copyText } = await import('../export/copy');
        const ok = await copyText(await source.text());
        setCopied(ok);
        flash(ok ? 'Copied' : 'Couldn’t copy. Your browser blocked it; try the CSV instead.');
      }
    } catch (e) {
      flash(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="nt-export-title">
      <h2 id="nt-export-title" className="mb-2 text-sm font-medium text-ink">
        Export {noun} {source && source.count > 0 && <span className="font-normal text-muted">({formatNumber(source.count)})</span>}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('csv')} aria-label={`Download ${noun} as CSV`}>
          {busy === 'csv' ? <Spinner /> : <FileSpreadsheet aria-hidden className="size-4" />}
          CSV
        </button>
        <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('pdf')} aria-label={`Download ${noun} as PDF`}>
          {busy === 'pdf' ? <Spinner /> : <FileDown aria-hidden className="size-4" />}
          PDF
        </button>
        <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('copy')} aria-label={copied ? 'Copied' : `Copy all ${noun}`}>
          {copied ? <Check aria-hidden className="size-4 text-mint" /> : busy === 'copy' ? <Spinner /> : <Copy aria-hidden className="size-4" />}
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>
      <p className="mt-2 min-h-4 text-xs text-muted" role="status" aria-live="polite">
        {message || (disabled ? emptyHint : nonLatin ? 'Some text uses characters the PDF can’t show; CSV keeps them exactly.' : '')}
      </p>
    </section>
  );
}
