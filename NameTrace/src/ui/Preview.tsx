import type { MatchSpan, NormRecord, SearchHit } from '../model/types';
import type { FileEntry } from '../state/fileStore';
import { Badge } from './Badge';
import { FieldGrid } from './FieldGrid';
import { Highlight } from './Highlight';
import { formatNumber, plural } from './summary';

const SPLIT_LIMIT = 300;
const CONTEXT = 2;

function Block({ record, spans, current }: { record: NormRecord; spans: MatchSpan[]; current: boolean }) {
  return (
    <li className={`rounded-lg px-3 py-2.5 ${current ? 'bg-surface ring-1 ring-accent/50' : 'opacity-75'}`} aria-current={current ? 'true' : undefined}>
      <p className="mb-1 text-xs text-muted">{record.source}</p>
      {record.kind === 'record' ? (
        <FieldGrid record={record} spans={spans} />
      ) : (
        <p className="font-serif text-[0.975rem] leading-relaxed whitespace-pre-line text-ink/90">
          <Highlight text={record.text} spans={spans} />
        </p>
      )}
    </li>
  );
}

export function Preview({
  hit,
  file,
  hitsById,
  headingId,
}: {
  hit: SearchHit | null;
  file: FileEntry | null;
  hitsById: Map<string, SearchHit>;
  headingId: string;
}) {
  if (hit && file) {
    const { record } = hit;
    const from = Math.max(0, record.index - CONTEXT);
    const around = record.kind === 'record' ? [record] : file.records.slice(from, record.index + CONTEXT + 1);
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id={headingId} className="text-sm font-semibold text-ink">
              {record.source}
            </h2>
            <p className="truncate text-xs text-muted">{record.fileName}</p>
          </div>
          <Badge kind={hit.best} />
        </div>
        {record.kind === 'record' ? (
          <FieldGrid record={record} spans={hit.spans} />
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">With the paragraphs around it for context.</p>
            <ol className="space-y-2">
              {around.map((r) => (
                <Block key={r.id} record={r} spans={hitsById.get(r.id)?.spans ?? []} current={r.id === record.id} />
              ))}
            </ol>
          </>
        )}
      </div>
    );
  }

  if (file && file.status === 'done') {
    const unitWord = file.records[0]?.kind === 'record' ? ['row', 'rows'] : ['block', 'blocks'];
    return (
      <div>
        <h2 id={headingId} className="text-sm font-semibold text-ink">
          How {file.name} was split
        </h2>
        <p className="mt-1 mb-3 text-xs text-muted">
          {plural(file.records.length, unitWord[0], unitWord[1])}, each searched on its own. Select a result to see it here in context.
        </p>
        <ol className="space-y-1.5">
          {file.records.slice(0, SPLIT_LIMIT).map((r) => (
            <li key={r.id} className="rounded-md border border-edge/60 px-3 py-2">
              <p className="text-xs text-muted">{r.source}</p>
              <p className="line-clamp-2 font-serif text-sm text-ink/80">{r.text}</p>
            </li>
          ))}
        </ol>
        {file.records.length > SPLIT_LIMIT && <p className="mt-3 text-xs text-muted">Showing the first {SPLIT_LIMIT} of {formatNumber(file.records.length)}.</p>}
      </div>
    );
  }

  return (
    <div>
      <h2 id={headingId} className="text-sm font-semibold text-ink">
        Preview
      </h2>
      <p className="mt-1 text-sm text-muted">Select a result to see it here with its context.</p>
    </div>
  );
}
