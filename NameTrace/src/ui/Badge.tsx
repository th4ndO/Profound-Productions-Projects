import type { MatchKind } from '../model/types';
import { KIND_LABEL } from './summary';

const STYLE: Record<MatchKind, string> = {
  exact: 'bg-accent/15 text-mint ring-1 ring-inset ring-accent/40',
  variant: 'bg-sky-400/10 text-sky-300 ring-1 ring-inset ring-sky-400/35',
  fuzzy: 'bg-warn/10 text-amber-200 outline-1 outline-dashed outline-warn/60 -outline-offset-1',
};

export function Badge({ kind }: { kind: MatchKind }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STYLE[kind]}`}>{KIND_LABEL[kind].badge}</span>;
}
