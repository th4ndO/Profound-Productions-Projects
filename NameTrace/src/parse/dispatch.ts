import type * as PdfJs from 'pdfjs-dist';
import type * as XLSXType from 'xlsx';
import { UNITS, type FileType, type Unit } from '../model/types';
import type { ParseContext, ParseOutput } from './common';
import { checkSize, detectType } from './detect';
import type { Mammoth } from './docx';

/** Heavy libraries are passed in so the browser worker and Node tests can load them differently. */
export interface Loaders {
  pdfjs(): Promise<{ lib: Pick<typeof PdfJs, 'getDocument'>; options?: Record<string, unknown> }>;
  xlsx(): Promise<typeof XLSXType>;
  mammoth(): Promise<Mammoth>;
}

export interface ParsedDocument extends ParseOutput {
  type: FileType;
  unit: Unit;
}

/** Detect the format, lazy-load its parser, and parse. Throws ParseError for user-facing problems. */
export async function parseBuffer(name: string, buf: ArrayBuffer, ctx: ParseContext, loaders: Loaders): Promise<ParsedDocument> {
  checkSize(buf.byteLength);
  const type = detectType(name, buf);
  let out: ParseOutput;
  switch (type) {
    case 'pdf': {
      const [{ parsePdf }, { lib, options }] = await Promise.all([import('./pdf'), loaders.pdfjs()]);
      out = await parsePdf(buf, ctx, lib, options);
      break;
    }
    case 'docx': {
      const [{ parseDocx }, mammoth] = await Promise.all([import('./docx'), loaders.mammoth()]);
      out = await parseDocx(buf, ctx, mammoth);
      break;
    }
    case 'xlsx': {
      const [{ parseWorkbook }, XLSX] = await Promise.all([import('./xlsx'), loaders.xlsx()]);
      out = await parseWorkbook(buf, ctx, XLSX);
      break;
    }
    case 'csv':
    case 'tsv': {
      const { parseDelimited } = await import('./csv');
      out = parseDelimited(buf, ctx, type === 'tsv' ? '\t' : '');
      break;
    }
    case 'json': {
      const { parseJson } = await import('./json');
      out = parseJson(buf, ctx);
      break;
    }
    case 'text': {
      const { parseText } = await import('./text');
      out = parseText(buf, ctx);
      break;
    }
  }
  return { ...out, type, unit: out.unit ?? UNITS[type] };
}
