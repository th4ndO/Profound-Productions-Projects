// jsPDF's built-in fonts use Windows-1252 (Latin-1 plus a few extras).
const CP1252_EXTRAS = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

export function pdfSafe(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  if (c === 9 || c === 10 || c === 13) return true;
  if (c >= 0x20 && c <= 0x7e) return true;
  if (c >= 0xa0 && c <= 0xff) return true;
  return CP1252_EXTRAS.includes(ch);
}

/** Replace characters the PDF fonts can't draw with "?", and say whether any were replaced. */
export function toPdfText(s: string): { text: string; replaced: boolean } {
  let replaced = false;
  let out = '';
  for (const ch of s.normalize('NFC')) {
    if (pdfSafe(ch)) out += ch;
    else {
      replaced = true;
      out += '?';
    }
  }
  return { text: out, replaced };
}

export function needsUnicodeFont(texts: Iterable<string>): boolean {
  for (const t of texts) if (toPdfText(t).replaced) return true;
  return false;
}
