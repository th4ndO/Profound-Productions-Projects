import { fieldRanges } from '../model/fields';
import type { MatchSpan, NormRecord } from '../model/types';
import { Highlight } from './Highlight';

/** Structured row as label/value pairs, matched fields first. */
export function FieldGrid({ record, spans, limit }: { record: NormRecord; spans: MatchSpan[]; limit?: number }) {
  const ranges = fieldRanges(record).map((r) => ({ ...r, hit: spans.some((s) => s.start < r.end && s.end > r.start) }));
  const ordered = [...ranges.filter((r) => r.hit), ...ranges.filter((r) => !r.hit)];
  const shown = limit ? ordered.slice(0, limit) : ordered;
  return (
    <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-1.5 text-sm">
      {shown.map((r) => (
        <div key={r.start} className="contents">
          <dt className={`truncate pt-px text-xs ${r.hit ? 'text-mint' : 'text-muted'}`} title={r.key}>
            {r.key}
          </dt>
          <dd className="min-w-0 font-serif text-[0.95rem] leading-snug break-words text-ink/90">
            <Highlight text={record.text} spans={spans} from={r.start} to={r.end} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
