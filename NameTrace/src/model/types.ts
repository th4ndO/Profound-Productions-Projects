export type FieldPair = [key: string, value: string];

/** One searchable unit produced by a parser. */
export interface NormRecord {
  id: string;
  fileId: string;
  fileName: string;
  /** Order within the file, starting at 0. */
  index: number;
  /** The unit used in counts: "Page 3", "Sheet Payroll", a heading, a JSON path. */
  group: string;
  /** Plain-words location: "Page 3, paragraph 2", "Sheet “Payroll”, row 14". */
  source: string;
  kind: 'text' | 'record';
  /** For structured rows: field values only, joined with FIELD_SEPARATOR. */
  text: string;
  fields: FieldPair[] | null;
}

export const FIELD_SEPARATOR = ' | ';

export type FileType = 'pdf' | 'docx' | 'csv' | 'tsv' | 'xlsx' | 'json' | 'text';

/** How a file type names its `group` unit in the results summary. */
export interface Unit {
  one: string;
  many: string;
}

export const UNITS: Record<FileType, Unit> = {
  pdf: { one: 'page', many: 'pages' },
  docx: { one: 'section', many: 'sections' },
  csv: { one: 'table', many: 'tables' },
  tsv: { one: 'table', many: 'tables' },
  xlsx: { one: 'sheet', many: 'sheets' },
  json: { one: 'path', many: 'paths' },
  text: { one: 'block', many: 'blocks' },
};

export interface ParseResult {
  records: NormRecord[];
  warnings: string[];
}

export type MatchKind = 'exact' | 'variant' | 'fuzzy';

export const KIND_RANK: Record<MatchKind, number> = { exact: 3, variant: 2, fuzzy: 1 };

/** A character range in NormRecord.text. */
export interface MatchSpan {
  start: number;
  end: number;
  kind: MatchKind;
}

export interface SearchOptions {
  exactOnly: boolean;
  caseSensitive: boolean;
  /** Only match inside this field (column) of structured records. */
  field?: string | null;
}

export interface SearchHit {
  record: NormRecord;
  spans: MatchSpan[];
  best: MatchKind;
}
