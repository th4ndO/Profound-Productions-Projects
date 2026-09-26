import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { ACCEPT_ATTR } from '../parse/detect';

export function DropZone({ onFiles, compact }: { onFiles: (files: File[]) => void; compact: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
      }}
      className={`rounded-xl transition-transform duration-200 ${over ? 'drop-active scale-[1.02] animate-dash bg-accent/5' : 'border border-dashed border-edge'}`}
    >
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`flex w-full items-center gap-4 rounded-xl text-left hover:bg-surface/60 ${compact ? 'px-4 py-3' : 'flex-col justify-center px-6 py-8 text-center'}`}
      >
        <span className={`grid shrink-0 place-items-center rounded-full bg-accent/15 text-mint ${compact ? 'size-9' : 'size-12'}`}>
          <Upload aria-hidden className={compact ? 'size-4' : 'size-5'} />
        </span>
        <span>
          <span className="block font-medium text-ink">{over ? 'Drop to add' : compact ? 'Add more files' : 'Drop files here, or choose files'}</span>
          <span className="mt-0.5 block text-xs text-muted">PDF, Word, Excel, CSV, JSON or text. Up to 60 MB each.</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="file-input"
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
