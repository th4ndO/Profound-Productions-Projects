import { fieldsToText } from '../model/fields';
import type { FieldPair, NormRecord, ParseResult, Unit } from '../model/types';

export interface ParseContext {
  fileId: string;
  fileName: string;
  /** Report progress between 0 and 1. */
  progress: (fraction: number) => void;
}

/** A user-facing parse failure: the message is shown as-is. */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export interface ParseOutput extends ParseResult {
  /** Overrides the file type's default unit, e.g. Markdown with headings. */
  unit?: Unit;
}

/** Collects records with consistent ids and indexes. */
export class RecordSink {
  readonly records: NormRecord[] = [];
  constructor(private ctx: Pick<ParseContext, 'fileId' | 'fileName'>) {}

  text(group: string, source: string, text: string): void {
    const t = text.trim();
    if (!t) return;
    this.push({ group, source, kind: 'text', text: t, fields: null });
  }

  row(group: string, source: string, fields: FieldPair[]): void {
    const kept = fields
      .map(([k, v]) => [k, String(v ?? '').replace(/\s+/g, ' ').trim()] as FieldPair)
      .filter(([, v]) => v !== '');
    if (!kept.length) return;
    this.push({ group, source, kind: 'record', text: fieldsToText(kept), fields: kept });
  }

  private push(r: Omit<NormRecord, 'id' | 'fileId' | 'fileName' | 'index'>): void {
    const index = this.records.length;
    this.records.push({ id: `${this.ctx.fileId}:${index}`, fileId: this.ctx.fileId, fileName: this.ctx.fileName, index, ...r });
  }
}

/** Make header names usable as field keys: fill blanks, de-duplicate. */
export function cleanHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    let name = String(h ?? '').replace(/\s+/g, ' ').trim() || `Column ${i + 1}`;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n > 1) name = `${name} (${n})`;
    return name;
  });
}

/** Decode text files: UTF-8 (BOM stripped), falling back to Windows-1252. */
export function decodeText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
