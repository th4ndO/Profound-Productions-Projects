/** A positioned piece of text from a PDF page (PDF user space: y grows upward). */
export interface PdfItem {
  str: string;
  x: number;
  y: number;
  width: number;
  /** Font size in user-space units. */
  size: number;
}

interface Line {
  y: number;
  size: number;
  text: string;
}

const BULLET_LINE = /^\s*(?:[•·▪◦‣●○■□–—*-]|\d{1,3}[.)]|[a-z][.)])\s+/i;
const PARAGRAPH_GAP_RATIO = 1.45;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Group items into lines and rebuild spacing from horizontal gaps. */
export function buildLines(items: PdfItem[]): Line[] {
  const usable = items.filter((i) => i.str.length > 0 && i.size > 0);
  const sorted = [...usable].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; size: number; items: PdfItem[] }[] = [];
  for (const it of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - it.y) <= 0.5 * Math.min(line.size, it.size)) line.items.push(it);
    else lines.push({ y: it.y, size: it.size, items: [it] });
  }
  return lines
    .map((l) => {
      const parts = [...l.items].sort((a, b) => a.x - b.x);
      let text = '';
      let prevEnd = -Infinity;
      for (const p of parts) {
        const gap = p.x - prevEnd;
        // A space is roughly 0.25em wide; treat anything over ~0.15em as one.
        if (text && gap > 0.15 * p.size && !/\s$/.test(text) && !/^\s/.test(p.str)) text += ' ';
        text += p.str;
        prevEnd = p.x + p.width;
      }
      return { y: l.y, size: median(parts.map((p) => p.size)), text: text.replace(/\s+/g, ' ').trim() };
    })
    .filter((l) => l.text);
}

/** Join a paragraph's lines, rejoining words hyphenated across a line break. */
function joinLines(lines: string[]): string {
  let out = '';
  for (const line of lines) {
    if (!out) out = line;
    else if (/\p{Ll}-$/u.test(out) && /^\p{Ll}/u.test(line)) out = out.slice(0, -1) + line;
    else out += ' ' + line;
  }
  return out;
}

/**
 * Split a page into paragraphs: a new paragraph starts where the vertical gap
 * exceeds ~1.45× the page's median line gap, where a line starts with a
 * bullet, or where text jumps back up the page (a new column).
 */
export function layoutPage(items: PdfItem[]): string[] {
  const lines = buildLines(items);
  if (!lines.length) return [];
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const d = lines[i - 1].y - lines[i].y;
    if (d > 0) gaps.push(d);
  }
  const typical = median(gaps);
  const paragraphs: string[][] = [[lines[0].text]];
  for (let i = 1; i < lines.length; i++) {
    const d = lines[i - 1].y - lines[i].y;
    const breakHere =
      d <= 0 || (typical > 0 && d > PARAGRAPH_GAP_RATIO * typical) || BULLET_LINE.test(lines[i].text) || Math.abs(lines[i].size - lines[i - 1].size) > 0.25 * lines[i - 1].size;
    if (breakHere) paragraphs.push([lines[i].text]);
    else paragraphs[paragraphs.length - 1].push(lines[i].text);
  }
  return paragraphs.map(joinLines).filter(Boolean);
}
