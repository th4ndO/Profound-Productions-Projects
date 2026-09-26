import { Check, Copy, FileDown, FileSpreadsheet } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { needsUnicodeFont } from '../export/pdfText';
import type { SearchHit } from '../model/types';
import { Spinner } from './Spinner';
import { formatNumber, type Summary } from './summary';

const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-edge bg-charcoal px-3 py-2 text-sm font-medium text-ink hover:border-accent hover:text-mint disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-edge disabled:hover:text-ink';

export function ExportBar({ hits, query, summary }: { hits: SearchHit[]; query: string; summary: Summary | null }) {
  const [busy, setBusy] = useState<'csv' | 'pdf' | 'copy' | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const disabled = !hits.length || !summary;
  const nonLatin = useMemo(() => needsUnicodeFont(hits.slice(0, 5000).map((h) => h.record.text + h.record.fileName)), [hits]);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setCopied(false);
    setMessage('');
  }, [hits]);

  const flash = (text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMessage('');
      setCopied(false);
    }, 2500);
  };

  const run = async (kind: 'csv' | 'pdf' | 'copy') => {
    if (!summary) return;
    setBusy(kind);
    try {
      const { download, fileNameFor } = await import('../export/common');
      if (kind === 'csv') {
        const { buildCsv } = await import('../export/csv');
        download(buildCsv(hits), 'text/csv;charset=utf-8', fileNameFor(query, 'csv'));
        flash('CSV downloaded');
      } else if (kind === 'pdf') {
        const { buildPdf } = await import('../export/pdf');
        const { bytes } = buildPdf(hits, query, summary.headline, summary.breakdown);
        download(bytes, 'application/pdf', fileNameFor(query, 'pdf'));
        flash('PDF downloaded');
      } else {
        const { buildPlainText, copyText } = await import('../export/copy');
        const ok = await copyText(buildPlainText(hits, summary.headline, summary.breakdown));
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
        Export results {hits.length > 0 && <span className="font-normal text-muted">({formatNumber(hits.length)})</span>}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('csv')} aria-label="Download results as CSV">
          {busy === 'csv' ? <Spinner /> : <FileSpreadsheet aria-hidden className="size-4" />}
          CSV
        </button>
        <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('pdf')} aria-label="Download results as PDF">
          {busy === 'pdf' ? <Spinner /> : <FileDown aria-hidden className="size-4" />}
          PDF
        </button>
        <button type="button" className={btn} disabled={disabled || !!busy} onClick={() => run('copy')} aria-label={copied ? 'Copied' : 'Copy all results'}>
          {copied ? <Check aria-hidden className="size-4 text-mint" /> : busy === 'copy' ? <Spinner /> : <Copy aria-hidden className="size-4" />}
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>
      <p className="mt-2 min-h-4 text-xs text-muted" role="status" aria-live="polite">
        {message || (disabled ? 'Search for a name to export what it finds.' : nonLatin ? 'Some text uses characters the PDF can’t show; CSV keeps them exactly.' : '')}
      </p>
    </section>
  );
}
