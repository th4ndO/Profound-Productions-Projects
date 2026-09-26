/**
 * A small reader for the HTML that mammoth produces. mammoth only emits a
 * fixed set of tags (h1–h6, p, ul/ol/li, table/tr/td/th, and inline tags such
 * as strong, em, a, img, br, sup, sub), so a purpose-built tokenizer is
 * enough, and it works in a Web Worker where DOMParser does not exist.
 */

export type DocBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'listItem'; text: string }
  | { type: 'table'; rows: string[][] };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function readMammothHtml(html: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  let text = ''; // text of the current paragraph/heading/item
  let tableDepth = 0;
  let listDepth = 0;
  let rows: string[][] = [];
  let row: string[] | null = null;
  let cell: string | null = null;
  let inLi = false;
  let last = 0;

  const appendText = (s: string) => {
    if (cell !== null && tableDepth >= 1) cell += s;
    else text += s;
  };

  TAG.lastIndex = 0;
  for (let m = TAG.exec(html); m; m = TAG.exec(html)) {
    appendText(decodeEntities(html.slice(last, m.index)));
    last = TAG.lastIndex;
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();

    if (tag === 'br') {
      appendText(' ');
      continue;
    }
    if (tableDepth > 1 && tag !== 'table') {
      // Nested table: flatten its text into the outer cell.
      if (!closing && (tag === 'td' || tag === 'th' || tag === 'p')) appendText(' ');
      continue;
    }
    switch (tag) {
      case 'table':
        if (!closing) {
          tableDepth++;
          if (tableDepth === 1) rows = [];
        } else {
          tableDepth--;
          if (tableDepth === 0) {
            blocks.push({ type: 'table', rows: rows.filter((r) => r.some((c) => c !== '')) });
            rows = [];
          }
        }
        break;
      case 'tr':
        if (!closing) row = [];
        else if (row) {
          rows.push(row);
          row = null;
        }
        break;
      case 'td':
      case 'th':
        if (!closing) cell = '';
        else if (cell !== null) {
          row?.push(clean(cell));
          cell = null;
        }
        break;
      case 'ul':
      case 'ol':
        listDepth += closing ? -1 : 1;
        break;
      case 'li':
        if (tableDepth) {
          appendText(' ');
          break;
        }
        if (!closing) {
          if (inLi && clean(text)) blocks.push({ type: 'listItem', text: clean(text) });
          text = '';
          inLi = true;
        } else {
          if (clean(text)) blocks.push({ type: 'listItem', text: clean(text) });
          text = '';
          inLi = listDepth > 1;
        }
        break;
      case 'p':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        if (tableDepth) {
          if (!closing && cell) cell += ' ';
          break;
        }
        if (inLi) break;
        if (!closing) text = '';
        else {
          const t = clean(text);
          if (t) blocks.push({ type: tag === 'p' ? 'paragraph' : 'heading', text: t });
          text = '';
        }
        break;
      default:
        break; // inline tags: keep their text, drop the markup
    }
  }
  appendText(decodeEntities(html.slice(last)));
  if (clean(text)) blocks.push({ type: 'paragraph', text: clean(text) });
  return blocks;
}
