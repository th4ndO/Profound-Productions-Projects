import type { FileType } from '../model/types';
import { ParseError } from './common';

export const MAX_FILE_BYTES = 60 * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'csv', 'tsv', 'xlsx', 'xls', 'xlsm', 'ods', 'json', 'txt', 'md', 'log'];

export const ACCEPT_ATTR = SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(',');

const ADVICE: Record<string, string> = {
  doc: 'Old Word files (.doc) are not supported. Open it in Word and use Save as → .docx, then add it again.',
  rtf: 'Rich text files (.rtf) are not supported. Open it in Word and save it as .docx.',
  odt: 'OpenDocument text files are not supported. Save it as .docx and add it again.',
  pages: 'Pages files are not supported. In Pages, choose File → Export to → Word or PDF.',
  numbers: 'Numbers files are not supported. In Numbers, choose File → Export to → Excel or CSV.',
  key: 'Keynote files are not supported. Export it as PDF first.',
  ppt: 'PowerPoint files are not supported. Export the slides as PDF, then add the PDF.',
  pptx: 'PowerPoint files are not supported. Export the slides as PDF, then add the PDF.',
  odp: 'Presentation files are not supported. Export them as PDF first.',
  xlsb: 'Binary Excel workbooks (.xlsb) are not supported. Save it as .xlsx and add it again.',
  zip: 'Zip archives are not supported. Unzip it and add the files inside.',
  msg: 'Outlook messages are not supported. Save the email as PDF or copy the text into a .txt file.',
  eml: 'Email files are not supported. Save the email as PDF or copy the text into a .txt file.',
  html: 'Web pages are not supported. Save the page as PDF, or copy the text into a .txt file.',
  htm: 'Web pages are not supported. Save the page as PDF, or copy the text into a .txt file.',
};
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'tif', 'tiff', 'bmp'];

export function extensionOf(name: string): string {
  const m = /\.([^.]+)$/.exec(name.toLowerCase());
  return m ? m[1] : '';
}

function unsupported(ext: string): ParseError {
  if (ADVICE[ext]) return new ParseError(ADVICE[ext]);
  if (IMAGE_EXT.includes(ext)) {
    return new ParseError('NameTrace reads text, not images. Run the image through OCR (for example, scan to searchable PDF) and add that instead.');
  }
  return new ParseError(
    `${ext ? `.${ext} files are` : 'This file type is'} not supported. Use PDF, Word (.docx), Excel (.xlsx, .xls, .ods), CSV, TSV, JSON, or plain text (.txt, .md, .log).`,
  );
}

export function checkSize(size: number): void {
  if (size > MAX_FILE_BYTES) {
    const mb = (size / 1024 / 1024).toFixed(0);
    throw new ParseError(`This file is ${mb} MB. NameTrace handles files up to 60 MB. Split it into smaller files and add them separately.`);
  }
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  let s = '';
  for (let i = Math.max(0, from); i < Math.min(bytes.length, to); i++) {
    const c = bytes[i];
    s += c >= 32 && c < 127 ? String.fromCharCode(c) : ' ';
  }
  return s;
}

/** Work out the real format from the file's bytes, using the extension as a hint. */
export function detectType(name: string, buf: ArrayBuffer): FileType {
  const ext = extensionOf(name);
  const bytes = new Uint8Array(buf);
  const head = ascii(bytes, 0, 8);

  if (head.startsWith('%PDF')) return 'pdf';

  // Zip container: OOXML or OpenDocument. Entry names live in the local
  // headers at the start and in the central directory at the end.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const names = ascii(bytes, 0, 4096) + ascii(bytes, bytes.length - 262144, bytes.length);
    if (names.includes('word/')) return 'docx';
    if (names.includes('xl/')) return 'xlsx';
    if (names.includes('opendocument.spreadsheet')) return 'xlsx';
    if (names.includes('opendocument.text')) throw unsupported('odt');
    if (names.includes('ppt/')) throw unsupported('pptx');
    throw unsupported(ext === 'docx' || ext === 'xlsx' ? 'zip' : ext || 'zip');
  }

  // Legacy OLE2 compound file: .xls reads fine, .doc/.ppt do not.
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    if (ext === 'xls' || ext === 'xlt') return 'xlsx';
    if (ext === 'ppt') throw unsupported('ppt');
    if (ext === 'msg') throw unsupported('msg');
    throw unsupported('doc');
  }

  switch (ext) {
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'ods':
      // Many systems export an HTML or XML table named .xls; SheetJS reads those.
      return 'xlsx';
    case 'csv':
      return 'csv';
    case 'tsv':
    case 'tab':
      return 'tsv';
    case 'json':
      return 'json';
    case 'txt':
    case 'md':
    case 'markdown':
    case 'log':
    case 'text':
      return 'text';
    case 'pdf':
      throw new ParseError('This file is named .pdf but isn’t a valid PDF. It may be damaged or only partly downloaded.');
    case 'docx':
      throw new ParseError('This file is named .docx but isn’t a valid Word document. It may be damaged, or an old .doc file that was renamed. Open it in Word and save it as .docx.');
    default:
      throw unsupported(ext);
  }
}
