import { ChevronDown } from 'lucide-react';
import { memo, useId, useState } from 'react';
import type { SearchHit } from '../model/types';
import { Badge } from './Badge';
import { FieldGrid } from './FieldGrid';
import { Highlight } from './Highlight';
import { plural, snippetRange } from './summary';

const FIELD_PREVIEW = 4;

export const ResultCard = memo(function ResultCard({
  hit,
  showFile,
  selected,
  onSelect,
}: {
  hit: SearchHit;
  showFile: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const { record, spans } = hit;
  const first = spans[0];
  const range = snippetRange(record.text, first.start, first.end);
  const truncated = range.start > 0 || range.end < record.text.length;
  const fieldCount = record.fields?.length ?? 0;
  const canExpand = record.kind === 'record' ? fieldCount > FIELD_PREVIEW : truncated;

  return (
    <article
      className={`group rounded-xl border p-4 transition-colors ${selected ? 'border-accent/70 bg-surface' : 'border-edge bg-charcoal hover:border-accent/40'}`}
      aria-current={selected ? 'true' : undefined}
    >
      <header className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          {showFile && <p className="truncate text-xs text-muted">{record.fileName}</p>}
          <h3 className="text-sm font-medium">
            <button
              type="button"
              onClick={() => onSelect(record.id)}
              className="rounded text-left text-ink hover:text-mint focus-visible:text-mint"
              aria-label={`Preview ${record.source}${showFile ? ` in ${record.fileName}` : ''}`}
            >
              {record.source}
            </button>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {spans.length > 1 && <span className="text-xs text-muted">{plural(spans.length, 'mention', 'mentions')}</span>}
          <Badge kind={hit.best} />
        </div>
      </header>

      <div id={bodyId} className="mt-3">
        {record.kind === 'record' ? (
          <FieldGrid record={record} spans={spans} limit={expanded ? undefined : FIELD_PREVIEW} />
        ) : (
          <p className="font-serif text-[0.975rem] leading-relaxed whitespace-pre-line text-ink/90">
            {!expanded && range.start > 0 && '… '}
            <Highlight text={record.text} spans={spans} from={expanded ? 0 : range.start} to={expanded ? record.text.length : range.end} />
            {!expanded && range.end < record.text.length && ' …'}
          </p>
        )}
      </div>

      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="mt-3 inline-flex items-center gap-1 rounded text-xs font-medium text-mint hover:text-ink"
        >
          <ChevronDown aria-hidden className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show less' : record.kind === 'record' ? `Show all ${fieldCount} fields` : 'Show full text'}
        </button>
      )}
    </article>
  );
});
