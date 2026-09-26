// Copies pdf.js character maps into public/ so PDFs with CJK and other CID
// fonts can be read. They are served from this site, never a CDN, and only
// fetched when a PDF needs them.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'pdfjs-dist', 'cmaps');
const to = join(root, 'public', 'pdfjs', 'cmaps');
if (!existsSync(from)) throw new Error('pdfjs-dist is not installed; run npm install first.');
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log('copied pdf.js cmaps to public/pdfjs/cmaps');
