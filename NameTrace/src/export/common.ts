import type { SearchHit } from '../model/types';
import { KIND_LABEL } from '../ui/summary';

/** The distinct texts that matched in a hit, in order. */
export function matchedText(hit: SearchHit): string {
  const seen: string[] = [];
  for (const s of hit.spans) {
    const t = hit.record.text.slice(s.start, s.end).replace(/\s+/g, ' ');
    if (!seen.includes(t)) seen.push(t);
  }
  return seen.join('; ');
}

export function matchLabel(hit: SearchHit): string {
  return KIND_LABEL[hit.best].badge;
}

export function fileNameFor(query: string, ext: string): string {
  const slug = query.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'results';
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `nametrace-${slug}-${date}.${ext}`;
}

export function download(data: BlobPart, type: string, name: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
