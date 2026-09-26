import { AlertCircle, AlertTriangle, ChevronDown, FileJson, FileSpreadsheet, FileText, File as FileIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMediaQuery } from './useMediaQuery';
import type { FileEntry } from '../state/fileStore';
import { formatBytes } from '../state/fileStore';
import { plural } from './summary';

function iconFor(f: FileEntry) {
  const t = f.fileType ?? (/\.(xlsx?|ods|csv|tsv)$/i.test(f.name) ? 'xlsx' : /\.json$/i.test(f.name) ? 'json' : 'text');
  if (t === 'xlsx' || t === 'csv' || t === 'tsv') return FileSpreadsheet;
  if (t === 'json') return FileJson;
  if (t === 'pdf' || t === 'docx' || t === 'text') return FileText;
  return FileIcon;
}

function statusText(f: FileEntry): string {
  switch (f.status) {
    case 'queued':
      return 'Waiting to read';
    case 'parsing':
      return `Reading… ${Math.round(f.progress * 100)}%`;
    case 'error':
      return 'Couldn’t read this file';
    case 'done':
      return `${plural(f.records.length, f.fileType === 'xlsx' || f.fileType === 'csv' || f.fileType === 'tsv' ? 'row' : 'block', f.fileType === 'xlsx' || f.fileType === 'csv' || f.fileType === 'tsv' ? 'rows' : 'blocks')} · ${formatBytes(f.size)}`;
  }
}

export function FileList({ files, onRemove }: { files: FileEntry[]; onRemove: (id: string) => void }) {
  const desktop = useMediaQuery('(min-width: 1024px)');
  // On small screens a long file list would push results out of view.
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (desktop) setOpen(true);
  }, [desktop]);
  useEffect(() => {
    if (!desktop && files.length > 3) setOpen(false);
    // Only react to the count crossing the threshold, not every update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, files.length > 3]);
  if (!files.length) return null;
  const busy = files.filter((f) => f.status === 'parsing' || f.status === 'queued').length;
  const problems = files.filter((f) => f.status === 'error' || f.warnings.length).length;
  const status = [busy ? `${busy} reading` : '', problems ? `${problems} with notes` : ''].filter(Boolean).join(' · ');
  return (
    <section aria-labelledby="nt-files-title">
      <h2 id="nt-files-title" className="mb-2 text-sm font-medium text-ink">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="nt-file-list"
          disabled={desktop}
          className="flex w-full items-center gap-2 rounded text-left disabled:cursor-default"
        >
          <span>
            Files <span className="font-normal text-muted">({files.length})</span>
          </span>
          {status && <span className="text-xs font-normal text-muted">{status}</span>}
          {!desktop && <ChevronDown aria-hidden className={`ml-auto size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />}
        </button>
      </h2>
      <ul id="nt-file-list" className="space-y-2" hidden={!open}>
        {files.map((f) => {
          const Icon = iconFor(f);
          return (
            <li key={f.id} className="rounded-lg border border-edge bg-charcoal px-3 py-2.5" data-testid="file-row" data-status={f.status}>
              <div className="flex items-start gap-3">
                <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${f.status === 'error' ? 'text-danger' : 'text-mint'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink" title={f.name}>
                    {f.name}
                  </p>
                  <p className={`text-xs ${f.status === 'error' ? 'text-danger' : 'text-muted'}`} aria-live={f.status === 'parsing' ? 'off' : 'polite'}>
                    {statusText(f)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(f.id)}
                  aria-label={`Remove ${f.name}`}
                  className="-mt-0.5 -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              {(f.status === 'parsing' || f.status === 'queued') && (
                <div
                  className="mt-2 h-1 overflow-hidden rounded-full bg-edge"
                  role="progressbar"
                  aria-label={`Reading ${f.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(f.progress * 100)}
                >
                  <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.max(3, f.progress * 100)}%` }} />
                </div>
              )}
              {f.error && (
                <p className="mt-2 flex gap-2 text-xs leading-relaxed text-red-200">
                  <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-danger" />
                  {f.error}
                </p>
              )}
              {f.warnings.map((w) => (
                <p key={w} className="mt-2 flex gap-2 text-xs leading-relaxed text-amber-100/90">
                  <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warn" />
                  {w}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
