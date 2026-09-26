import { FileSearch, SearchX, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { Spinner } from './Spinner';
import { formatNumber } from './summary';

function Shell({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent/10 text-mint ring-1 ring-accent/25">{icon}</div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children && <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export function NoFiles() {
  return (
    <Shell icon={<Upload aria-hidden className="size-6" />} title="Add a file to start">
      <p>Drop PDFs, Word documents, spreadsheets, CSV, JSON or text files on the left, then type a name.</p>
      <p>Files are read on this device. Nothing is uploaded.</p>
    </Shell>
  );
}

export function StillParsing({ count }: { count: number }) {
  return (
    <div className="flex justify-center px-6 py-16">
      <Spinner label={count === 1 ? 'Reading your file…' : `Reading ${count} files…`} />
    </div>
  );
}

export function NoQuery({ records, files }: { records: number; files: number }) {
  return (
    <Shell icon={<FileSearch aria-hidden className="size-6" />} title="Type a name to search">
      <p>
        Ready to search {formatNumber(records)} {records === 1 ? 'entry' : 'entries'} in {files} {files === 1 ? 'file' : 'files'}.
      </p>
      <p>Smart search also finds “Connor, Sarah”, “S. Connor”, “Sarah J. Connor”, emails like sarah.connor@…, and likely typos.</p>
    </Shell>
  );
}

export function NoFilesReadable() {
  return (
    <Shell icon={<SearchX aria-hidden className="size-6" />} title="None of these files could be read">
      <p>Check the messages next to each file for what to do, or add a different file.</p>
    </Shell>
  );
}

export function NoMatches({ query, suggestions }: { query: string; suggestions: ReactNode[] }) {
  return (
    <Shell icon={<SearchX aria-hidden className="size-6" />} title={`No matches for “${query.trim()}”`}>
      {suggestions.length > 0 && (
        <ul className="mt-1 space-y-2 text-left">
          {suggestions.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-mint" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
