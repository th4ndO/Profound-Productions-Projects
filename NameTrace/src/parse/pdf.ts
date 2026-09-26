import type * as PdfJs from 'pdfjs-dist';
import { type ParseContext, type ParseOutput, ParseError, RecordSink } from './common';
import { layoutPage, type PdfItem } from './pdfLayout';

type PdfLib = Pick<typeof PdfJs, 'getDocument'>;

function describePages(pages: number[]): string {
  if (pages.length <= 8) return pages.join(', ');
  return `${pages.slice(0, 8).join(', ')} and ${pages.length - 8} more`;
}

/**
 * PDF: rebuild lines and paragraphs from text positions, one record per
 * paragraph. Pages without a text layer (scans) produce a warning.
 */
export async function parsePdf(buf: ArrayBuffer, ctx: ParseContext, pdfjs: PdfLib, docOptions: Record<string, unknown> = {}): Promise<ParseOutput> {
  const task = pdfjs.getDocument({
    data: new Uint8Array(buf),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: false,
    ...docOptions,
  });
  let doc: PdfJs.PDFDocumentProxy;
  try {
    doc = await task.promise;
  } catch (e) {
    const err = e as { name?: string; message?: string };
    if (err?.name === 'PasswordException') {
      throw new ParseError('This PDF is password-protected. Open it, save or print an unprotected copy, and add that instead.');
    }
    throw new ParseError(`This PDF couldn’t be read (${err?.message ?? String(e)}). It may be damaged.`);
  }

  const sink = new RecordSink(ctx);
  const noText: number[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items: PdfItem[] = [];
      for (const it of content.items) {
        if (!('str' in it)) continue;
        const [a, b, c, d, e, f] = it.transform as number[];
        const size = Math.hypot(c, d) || Math.hypot(a, b) || it.height;
        items.push({ str: it.str, x: e, y: f, width: it.width, size });
      }
      const paragraphs = layoutPage(items);
      if (!paragraphs.length) noText.push(p);
      paragraphs.forEach((text, i) => sink.text(`Page ${p}`, `Page ${p}, paragraph ${i + 1}`, text));
      page.cleanup();
      ctx.progress(p / doc.numPages);
    }
  } finally {
    await doc.destroy();
  }

  const warnings: string[] = [];
  if (noText.length === doc.numPages) {
    warnings.push('This PDF looks scanned: its pages have no text layer, so there is nothing to search. Run it through OCR (for example, “Recognize text” in Acrobat or a scanner app), then add the new file.');
  } else if (noText.length) {
    warnings.push(`${noText.length === 1 ? 'Page' : 'Pages'} ${describePages(noText)} ${noText.length === 1 ? 'has' : 'have'} no text layer (probably scanned) and ${noText.length === 1 ? 'was' : 'were'} skipped. Run the PDF through OCR to include ${noText.length === 1 ? 'it' : 'them'}.`);
  }
  return { records: sink.records, warnings };
}
