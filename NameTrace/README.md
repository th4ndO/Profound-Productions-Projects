# NameTrace

Find every record, row, paragraph or detail that mentions a person's name,
across PDFs, Word documents, spreadsheets, CSV, JSON and text files.
Everything happens in the browser: **documents never leave the device.**

Built for people handling personal information under POPIA: church rosters,
HR files, incident logs, membership exports.

---

## Run it

Needs Node 20 or newer.

```bash
cd NameTrace
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm test` | Unit tests (Vitest): matcher, parsers, store, exporters, 50k-record benchmark |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the built site at http://localhost:4173 |
| `npm run e2e` | Playwright end-to-end tests with axe accessibility checks (builds first) |
| `npm run fixtures` | Regenerate the test files in `fixtures/` (all names are invented) |

For `npm run e2e` on a machine without Playwright's own browsers, point it at
any Chromium: `CHROMIUM_PATH=/path/to/chrome npm run e2e`.

`dist/` is a plain static site. Any static host works (Vercel, Netlify, an
internal web server). There is nothing to configure and no server code.

---

## Privacy: how "nothing leaves the device" is enforced

- **No backend, no analytics, no fonts or scripts from other sites.** Fonts are
  bundled (`@fontsource`), and pdf.js character maps are served from the same site.
- **A Content-Security-Policy** in `index.html` blocks the page from connecting to
  any other origin (`connect-src 'self'`). Even a bug couldn't send a document out.
- **The end-to-end tests check it:** they fail if the page makes a request to any
  other origin while files are loaded, searched and exported.
- Files are read with `File.arrayBuffer()` and parsed in a Web Worker. Closing the
  tab discards everything. Nothing is written to storage.

---

## How to use it

New users can select **Take the tour** in the header (or **New here? Take a
1-minute tour** on the start screen). The 9-step guided tour highlights each part of
the page. It can load **sample files** (invented names, served from this site), open a
leader's people and run a sample search, so every step has real results to point at.
Use the arrow keys or buttons to move through it, and Esc to close. It never starts by
itself and stores nothing.

### Everyone under a leader (the main view)

1. Drop your roster export on the left: .xlsx, .xls (including .xlsx files saved with a
   .xls name), .ods or CSV. You can add several at once.
2. When a file has a **Leader at 1728** column, the page opens in **Leaders**. Every
   leader is listed with how many people they have. Type in **Filter leaders** to find
   one. If there are other leader columns (Leader at 12 or 144), pick one under **Leader column**.
3. Select a leader to see **everyone under them, once each**:
   - their phone number, email and address, with links to call or email
   - every event they came to, with its type and date
   - how many visits they made
4. **Spellings of a leader are grouped.** For example, “Thabo Nkosi” and “Thabo (TK) Nkosi”,
   or a one-letter typo, count as one leader and are shown as “Also written as…”. Each
   visit recorded under a different spelling is marked **Leader written “…”** so you
   can check it. Rows with an empty leader cell are listed under **No leader listed**.
5. Use **Find someone in this list** and **Sort by** (name, most visits, latest visit)
   to narrow it down.
6. Export that leader's people: **CSV** (one row per person, with contacts and
   visits), **PDF** (a printable list) or **Copy all** (plain text for a message).

### Find a person

Switch to **Find a person** to search for any name across all files, including PDFs,
Word documents and text files.

1. Type a name. Results update as you type (a 140 ms pause), and Enter searches at once.
   `/` or `Ctrl K` / `⌘K` jumps to the search box, and `Esc` clears it.
2. Narrow down with **Search in** (one file or all) and **Column** (for example, only
   the Full Name column).
3. Select a result to see it in context: the neighbouring paragraphs, or the
   whole row.
4. Export: **CSV** (every match, with the original columns), **PDF** or **Copy all**.

---

## How matching works

Each file is split into records: a PDF paragraph, a Word paragraph or table row,
a spreadsheet row, a JSON object, or a block of text. Structured rows are
searched on their **values only**, so column headers never produce matches.

### Smart search (default)

Text is split into word tokens (letters, digits, apostrophes, hyphens), and
compared with accents removed (José = Jose) and, unless **Case sensitive** is on,
ignoring case.

| Found as | Examples for “Sarah Connor” |
|---|---|
| **Exact** | Sarah Connor · SARAH CONNOR · José Álvarez for “Jose Alvarez” · Sarah Connor's (only “Sarah Connor” is highlighted) |
| **Name variant** | Connor, Sarah · Connor Sarah · Sarah J. Connor · Sarah Jane Connor · S. Connor · S Connor · sarah.connor@example.com · sarah_connor · Nomsa (Mo) Dlamini for “Nomsa Dlamini” |
| **Possible typo** | Sarah Conner · Sarha Connor · Sara Connor |

- **A query typed “Last, First” is reordered** to “First Last” before matching.
- **Only certain things may sit between name parts:** spaces, one comma (in the
  reversed form), the dot after an initial, a lone `.` or `_` (emails and handles),
  or brackets around a single word. Anything else breaks the name, so
  “John Connor. Sarah Smith” does **not** match “Sarah Connor”, and neither does a
  match that would span two spreadsheet columns.
- **One extra word** (a middle name, initial or bracketed nickname) is allowed between parts.
  Two are not.
- **Initials** may stand in for any part except the surname.
- **Brackets in the query are optional:** “Nomsa (Mo) Dlamini” also finds
  “Nomsa Dlamini”, as a name variant.

**Typos** are measured with optimal string alignment distance (insertions,
deletions, substitutions and swapped neighbours each count as one edit).

| Name part length | Edits allowed (multi-word query) | Single-word query |
|---|---|---|
| up to 3 letters | 0 | 0 (up to 4 letters) |
| 4–5 letters | 1 | 1 (5–7 letters) |
| 6–7 letters | 1 (*2 in the original brief*) | 1 |
| 8+ letters | 2 | 2 |

The default **strict** policy adds three rules to the brief's budgets, to cut
false positives: a typo must keep the part's **first letter**, 6–7 letter parts
get **1** edit, not 2, and the whole name may carry at most **2** edits. Without these,
“Sarah Connor” matched “Sarah **Cannon**”, a real, different surname. The
brief's original budgets are still available: set `DEFAULT_FUZZY_POLICY` to
`'brief'` in `src/match/smart.ts`.

In **case-sensitive** mode, a difference only in capital letters is a miss, never a typo.

### Exact match only

The query literally, as whole words, with any run of spaces matching any run of
spaces. Accents count (José ≠ Jose). Case follows the **Case sensitive** toggle.
“Last, First” is **not** reordered here, because literal means literal.

### Speed

An index of every distinct word is built in the worker when a file loads.
Each search looks up candidate words for every name part (including typos
within budget), intersects the records that contain them, and only runs the
full matcher on those.

| Measurement | Result |
|---|---|
| 50,000 records, every keystroke of 5 names, smart search only (unit benchmark) | p50 ≈ 4 ms, **p95 ≈ 51 ms**, worst ≈ 80 ms |
| Same, exact mode | p95 ≈ 5 ms |
| 100,000-row workbook in Chromium, Enter to rendered results | 36–187 ms |
| 100,000-row workbook, longest main-thread task while loading | 50–140 ms (was ~1.1 s before batching) |
| Two real roster exports (about 1,200 and 1,450 rows), each “Leader at 1728” value searched in that column | 100% recall for all 49 values; 0.1–41 ms per search |

---

## Supported files

| Type | Split into | Location label |
|---|---|---|
| PDF | Paragraphs, rebuilt from text positions | `Page 3, paragraph 2` |
| Word (.docx) | Headings, paragraphs, list items, table rows (first row = headers) | `Associates, table 1, row 2` |
| Excel (.xlsx, .xls, .xlsm), OpenDocument (.ods) | One record per row per sheet; first non-empty row = headers | `Sheet “Payroll”, row 14` (the real row number) |
| CSV, TSV | One record per row; header row = field names | `Row 14` (the line number in the file) |
| JSON | Each object in an array (nested keys flattened with dots); leftover values at each level | `incidents[3]` |
| Text, Markdown, logs | Blocks separated by blank lines, or line by line | `Paragraph 4 (line 12)` |

The file type is detected from the file's **contents**, not just its name. Many
systems export an `.xlsx` workbook, or an HTML table, with a `.xls` name, and these read fine.

Files over 60 MB are refused with a message to split them.

---

## Known limits

- **Scanned PDFs need OCR.** A PDF made of images has no text to search.
  NameTrace detects this and says so, but can't read it. Run OCR first
  (for example, “Recognize text” in Acrobat, or a scanner app that saves searchable PDFs).
- **PDF paragraph detection is a heuristic.** Paragraphs are split where the
  line gap is over 1.45× the page's usual gap, at bullets, and where the font
  size changes. Multi-column layouts, tables inside PDFs and unusual spacing
  can split or merge paragraphs differently from how they look.
  Words hyphenated across lines are rejoined only when both halves are lowercase.
- **No old Word (.doc), PowerPoint, Pages or RTF files.** Each gets a specific
  message saying how to convert it (for example, “Save as → .docx”).
- **PDF export uses Latin-only fonts.** Accented Latin names (é, ñ, ü) are fine.
  Characters outside Windows-1252 (Cyrillic, Greek, Arabic, Chinese and others) appear as
  “?” in the PDF, with a note on each page. The app warns before export. The
  **CSV export keeps every character exactly.** A future fix: lazy-load a
  bundled Noto Sans subset (~400 KB for Latin, Greek and Cyrillic; several MB for CJK).
- **Hyphenated first names don't split:** “Sarah-Jane Connor” is not found by
  “Sarah Connor”, and vice versa.
- **Password-protected PDFs and workbooks** can't be opened. The message
  explains how to save an unprotected copy.
- **Very large files use a lot of memory.** Records are held in the page after
  parsing. Memory use hasn't been measured beyond 100,000 rows. If it becomes a
  problem, the next step is keeping records in the worker and sending back
  only the results.
- **Browsers:** tested in Chromium only (unit tests in Node, end-to-end in
  Chromium). It is written for current Chrome, Edge, Firefox and Safari, but
  those haven't been tested yet. Where nested workers aren't available, pdf.js
  falls back to running inside the parsing worker. That fallback path is untested.

---

## Project layout

```
src/
  match/     tokenizer, exact and smart matchers, token index, search
  parse/     type detection, one parser per format, the worker, message protocol
  state/     file store: queue (2 at a time), progress, cancel-on-remove
  ui/        React components, summary sentence, highlighting
  export/    CSV, PDF, plain-text copy (each loaded on first use)
  model/     record types, field helpers, column statistics
scripts/     fixture generator, pdf.js asset copy
fixtures/    generated test files (invented names only)
e2e/         Playwright tests
```

The first page load ships only the interface (about 270 KB of JavaScript, 86 KB gzipped).
Each parser, pdf.js, SheetJS, mammoth and jsPDF load only when a file or an
export needs them.

### Design notes

- Parsing happens in a module Web Worker, one per file (up to two at once).
  Removing a file terminates its worker. Records come back in batches of 2,000,
  and the index is packed into typed arrays that transfer without copying.
- DOCX is converted with mammoth, and its HTML is read with a small tokenizer
  written for mammoth's fixed set of tags, because `DOMParser` doesn't exist in workers.
- SheetJS is installed from the SheetJS CDN (0.20.3), not npm, whose 0.18.5 has known vulnerabilities.
- `vite.config.ts` forces `NODE_ENV=production` for builds. A development
  value left in the shell otherwise ships React's much larger development build.
