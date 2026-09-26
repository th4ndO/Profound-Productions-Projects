import type * as XLSXType from 'xlsx';
import { type ParseContext, type ParseOutput, ParseError, RecordSink, cleanHeaders } from './common';

type Row = Record<string, unknown> & { __rowNum__: number };

/**
 * Excel/ODS: one record per non-empty row per sheet. The first non-empty row
 * of each sheet is its header. Row numbers are the real sheet row numbers
 * (from SheetJS's __rowNum__), so they match what Excel shows.
 */
export async function parseWorkbook(buf: ArrayBuffer, ctx: ParseContext, XLSX: typeof XLSXType): Promise<ParseOutput> {
  let wb: XLSXType.WorkBook;
  try {
    wb = XLSX.read(new Uint8Array(buf), { type: 'array', dense: true, cellHTML: false, cellFormula: false, cellStyles: false });
  } catch (e) {
    const msg = String((e as Error).message || e);
    if (/password|encrypt/i.test(msg)) {
      throw new ParseError('This workbook is password-protected. Open it in Excel, remove the password (File → Info → Protect Workbook), save, and add it again.');
    }
    throw new ParseError(`This spreadsheet couldn’t be read (${msg}). Try opening it in Excel and saving it as .xlsx.`);
  }

  // Reading the workbook is the slow part; count it as the first 40%.
  ctx.progress(0.4);
  const sink = new RecordSink(ctx);
  const warnings: string[] = [];
  const step = (s: number, within: number) => ctx.progress(0.4 + (0.6 * (s + within)) / names.length);
  const empty: string[] = [];
  const names = wb.SheetNames;
  names.forEach((name, s) => {
    const ws = wb.Sheets[name];
    // header: 'A' keys cells by column letter and keeps __rowNum__ on each row.
    const rows = ws ? (XLSX.utils.sheet_to_json(ws, { header: 'A', raw: false, defval: '', blankrows: false }) as Row[]) : [];
    const first = rows.findIndex((r) => Object.keys(r).some((k) => String(r[k]).trim() !== ''));
    if (first < 0) {
      empty.push(name);
      step(s, 1);
      return;
    }
    const cols = Object.keys(rows[first]);
    for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
    cols.sort((a, b) => XLSX.utils.decode_col(a) - XLSX.utils.decode_col(b));
    const headers = cleanHeaders(cols.map((c) => rows[first][c]));
    const group = `Sheet ${name}`;
    for (let i = first + 1; i < rows.length; i++) {
      const r = rows[i];
      sink.row(group, `Sheet “${name}”, row ${r.__rowNum__ + 1}`, cols.map((c, j) => [headers[j], String(r[c] ?? '')]));
      if (i % 5000 === 0) step(s, i / rows.length);
    }
    step(s, 1);
  });

  if (!sink.records.length) warnings.push('This workbook has no data rows to search.');
  else if (empty.length && names.length > 1) {
    // Blank sheets are common (Sheet2, Sheet3); mention them quietly.
    warnings.push(`${empty.length === 1 ? 'Sheet' : 'Sheets'} ${empty.map((n) => `“${n}”`).join(', ')} ${empty.length === 1 ? 'is' : 'are'} empty.`);
  }
  return { records: sink.records, warnings };
}
