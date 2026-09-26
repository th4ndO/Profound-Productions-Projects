import { type ParseContext, type ParseOutput, ParseError, RecordSink, cleanHeaders } from './common';
import { readMammothHtml } from './mammothHtml';

export interface Mammoth {
  convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}

/**
 * Word (.docx): the most recent heading is the section. Headings, paragraphs,
 * list items and table rows each become a record; a table's first row is its
 * header and each later row's cells become fields.
 */
export async function parseDocx(buf: ArrayBuffer, ctx: ParseContext, mammoth: Mammoth): Promise<ParseOutput> {
  let html: string;
  try {
    html = (await mammoth.convertToHtml({ arrayBuffer: buf })).value;
  } catch (e) {
    const msg = String((e as Error).message || e);
    if (/encrypt|password|central directory|zip/i.test(msg)) {
      throw new ParseError('This Word document couldn’t be opened. If it is password-protected, open it in Word, remove the password, save, and add it again.');
    }
    throw new ParseError(`This Word document couldn’t be read (${msg}).`);
  }
  ctx.progress(0.6);

  const sink = new RecordSink(ctx);
  let section: string | null = null;
  let para = 0;
  let item = 0;
  let table = 0;
  const where = (label: string) => (section ? `${section}, ${label}` : label.charAt(0).toUpperCase() + label.slice(1));
  const group = () => section ?? 'Document start';

  for (const b of readMammothHtml(html)) {
    switch (b.type) {
      case 'heading':
        section = b.text;
        para = item = table = 0;
        sink.text(b.text, `${b.text}, heading`, b.text);
        break;
      case 'paragraph':
        sink.text(group(), where(`paragraph ${++para}`), b.text);
        break;
      case 'listItem':
        sink.text(group(), where(`list item ${++item}`), b.text);
        break;
      case 'table': {
        table++;
        if (!b.rows.length) break;
        if (b.rows.length === 1) {
          sink.text(group(), where(`table ${table}, row 1`), b.rows[0].join(' | '));
          break;
        }
        const headers = cleanHeaders(b.rows[0]);
        b.rows.slice(1).forEach((cells, i) => {
          const fields = cells.map((c, j) => [headers[j] ?? `Column ${j + 1}`, c] as [string, string]);
          sink.row(group(), where(`table ${table}, row ${i + 2}`), fields);
        });
        break;
      }
    }
  }
  ctx.progress(1);
  return { records: sink.records, warnings: sink.records.length ? [] : ['This Word document has no text to search.'] };
}
