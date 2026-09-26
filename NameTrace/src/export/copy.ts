import type { SearchHit } from '../model/types';
import { matchLabel, matchedText } from './common';

export function buildPlainText(hits: SearchHit[], headline: string, breakdown: string): string {
  const lines = [headline, breakdown, ''];
  hits.forEach((h, i) => {
    lines.push(`${i + 1}. ${h.record.fileName} · ${h.record.source} · ${matchLabel(h)} · “${matchedText(h)}”`);
    if (h.record.fields) for (const [k, v] of h.record.fields) lines.push(`   ${k}: ${v}`);
    else lines.push(`   ${h.record.text.replace(/\s*\n\s*/g, ' ')}`);
    lines.push('');
  });
  return lines.join('\n').trimEnd() + '\n';
}

/** Copy text; falls back to a hidden textarea where the Clipboard API is unavailable (non-HTTPS). */
export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or document not focused: try the fallback.
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  document.body.append(ta);
  const active = document.activeElement as HTMLElement | null;
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  active?.focus?.();
  return ok;
}
