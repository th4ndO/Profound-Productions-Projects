import Papa from 'papaparse';
import { type ParseContext, type ParseOutput, RecordSink, cleanHeaders, decodeText } from './common';

/**
 * CSV/TSV: the first non-empty row is the header. `Row N` is the line number
 * in the file where the row starts, so it matches what a text editor shows,
 * even when quoted cells span several lines.
 */
export function parseDelimited(buf: ArrayBuffer, ctx: ParseContext, delimiter: ',' | '\t' | ''): ParseOutput {
  const text = decodeText(buf).replace(/^﻿/, '');
  const sink = new RecordSink(ctx);
  const group = ctx.fileName;
  let headers: string[] | null = null;
  let cursor = 0; // char offset where the next row starts
  let line = 1; // line number at `cursor`
  let rows = 0;
  const warnings: string[] = [];

  const advance = (to: number) => {
    for (let i = cursor; i < to; i++) {
      const c = text.charCodeAt(i);
      if (c === 10 || (c === 13 && text.charCodeAt(i + 1) !== 10)) line++;
    }
    cursor = to;
  };

  // Skip leading line breaks so the header line is reported correctly.
  const lead = /^[\r\n]*/.exec(text)![0].length;
  advance(lead);

  const result = Papa.parse<string[]>(text.slice(lead), {
    delimiter,
    skipEmptyLines: false,
    step: (res) => {
      const rowLine = line;
      advance(lead + res.meta.cursor);
      // Papa's cursor sits after the row's line break; step past it.
      const row = res.data;
      if (row.length === 1 && row[0].trim() === '') return;
      if (!headers) {
        headers = cleanHeaders(row);
        return;
      }
      rows++;
      const fields = headers.map((h, i) => [h, row[i] ?? ''] as [string, string]);
      for (let i = headers.length; i < row.length; i++) fields.push([`Column ${i + 1}`, row[i]]);
      sink.row(group, `Row ${rowLine}`, fields);
      if (rows % 2000 === 0) ctx.progress(Math.min(0.99, (lead + res.meta.cursor) / text.length));
    },
  });
  void result;
  if (!headers) warnings.push('This file is empty.');
  else if (!sink.records.length) warnings.push('This file has a header row but no data rows.');
  ctx.progress(1);
  return { records: sink.records, warnings };
}
