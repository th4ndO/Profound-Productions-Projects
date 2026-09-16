import { formatRand } from "@/lib/format";

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={className}>{formatRand(cents)}</span>;
}
