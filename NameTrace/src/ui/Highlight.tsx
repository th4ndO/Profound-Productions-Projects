import type { MatchSpan } from '../model/types';
import { KIND_LABEL } from './summary';

/**
 * Render `text.slice(from, to)` with spans highlighted. Span offsets are into
 * the full text; spans partly outside the window are clipped.
 */
export function Highlight({ text, spans, from = 0, to = text.length }: { text: string; spans: MatchSpan[]; from?: number; to?: number }) {
  const out: React.ReactNode[] = [];
  let pos = from;
  const visible = spans.filter((s) => s.end > from && s.start < to).sort((a, b) => a.start - b.start);
  visible.forEach((s, i) => {
    const start = Math.max(s.start, from);
    const end = Math.min(s.end, to);
    if (start > pos) out.push(text.slice(pos, start));
    out.push(
      <mark key={i} className={s.kind === 'fuzzy' ? 'hl-fuzzy' : 'hl'} title={KIND_LABEL[s.kind].badge}>
        {text.slice(start, end)}
      </mark>,
    );
    pos = end;
  });
  if (pos < to) out.push(text.slice(pos, to));
  return <>{out}</>;
}
