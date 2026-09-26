# NameTrace: build plan

A browser-only app that parses documents and finds every record, row, paragraph or
detail that mentions a given person's name. No backend: documents never leave the
device.

Status: **built** (phases 1–7). See “As built” at the end for where the build differs from this plan.

---

## 1. Decisions and pushback (read this first)

These are the places where I'd do something different from, or more specific than, the
brief. Each has a default I'll use unless you say otherwise.

| # | Topic | Proposal | Why |
|---|---|---|---|
| D1 | **TypeScript version** | Pin `typescript@~5.9`, not npm's `latest` (7.0). | TS 7 is the new Go-native compiler. Pinning 5.9 avoids tooling surprises (vitest, eslint, type-aware plugins). It's easy to bump later. |
| D2 | **Fonts** | Self-host through `@fontsource-variable/inter` (UI) and `@fontsource-variable/source-serif-4` (document text), bundled by Vite. No Google Fonts. | A Google Fonts request is a third-party network call on every load. That breaks "no network calls except loading libraries" in spirit and leaks the visitor's IP to Google. |
| D3 | **Enforce "no network" with CSP** | Add a `<meta http-equiv="Content-Security-Policy">`: `default-src 'self'; connect-src 'self'; worker-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'`. The Playwright test asserts that no request leaves the origin. | This turns the privacy promise into something the browser enforces and CI checks, instead of a promise in the README. |
| D4 | **DOCX in a worker** | Use `mammoth.convertToHtml` (its own XML parser works in a worker), then read its output with a **small tokenizer written for mammoth's fixed tag subset** (`h1–h6, p, ul/ol/li, table/tr/td/th`, inline tags ignored). No DOMParser. | mammoth never uses DOMParser itself. The trap is only in reading its *output*. Its output is a small, predictable subset, so a 100-line tokenizer is safer than pulling in a general HTML parser. (Considered: `extractRawText`. Rejected because it loses headings and tables.) |
| D5 | **pdf.js inside our worker** | Set `GlobalWorkerOptions.workerSrc` from `pdfjs-dist/build/pdf.worker.min.mjs?url` as asked. Our parse worker then starts pdf.js's worker as a nested worker (Chrome, Firefox, Safari 15.5+). If nesting isn't available, fall back to pdf.js's in-thread mode, which is still off the main thread because we're already in a worker. | pdf.js won't run cleanly in a worker unless you wire this up yourself. |
| D6 | **Search speed** | Build an **inverted token index** (normalised token → record ids) once per file. For each query: (a) find the unique tokens within budget of each name part (exact, initial or fuzzy), which is a set far smaller than all tokens; (b) only run the full span matcher on records that hold a surname candidate. | 50k records at about 20 tokens each is about 1M tokens. Running an edit distance on every token per keystroke would miss 100 ms. The unique vocabulary is usually 10–50k, and the length filter cuts it further. I'll measure first and only move search into a worker if the index isn't enough. |
| D7 | **Fuzzy false positives** | *Proposed tightening:* a "possible typo" must keep the **first letter** of each fuzzy name part (José ↔ Jose still counts, because accents are stripped first), and the total edits across the whole name must be ≤ 2. | Using only the brief's budgets, "Sarah Connor" matches "Sarah **Cannon**" (connor → cannon is 2 edits), and "Sara Conner" gets 1 + 1. Real typos rarely change the first letter. I'll build both behaviours behind a constant, show you the fixture results for each, and let you choose. |
| D8 | **Rendering many results** | Show the first 200 result cards, then a "Show 200 more" button. The count, summary and exports always cover *all* matches. | 50k DOM cards freeze the page. A virtual list adds a dependency and makes "Show full text" (variable heights) fiddly. Paging is simpler and accessible. |
| D9 | **PDF export and non-Latin names** | Keep jsPDF's built-in Helvetica. Before rendering, detect characters outside WinAnsi (Latin-1 plus accents), replace them with `?` in the PDF only, and add a footer line: "Some characters couldn't be shown in this PDF. Use CSV export for the exact text." The UI shows the same notice before export. | A Noto font covering Latin-ext, Cyrillic and Greek adds ~400 KB; CJK adds several MB. The brief already lists "Latin-only fonts in PDF export" as a known limit. Upgrade path: lazy-load a bundled Noto Sans subset (no CDN) if you need it. |
| D10 | **Data model additions** | Keep the record shape exactly as specified. Add per *file*: `unitSingular / unitPlural` ("page/pages", "sheet/sheets", "section/sections", "path/paths", "block/blocks") so the summary sentence can count in each file type's unit. Offsets of each field value inside `text` are worked out when searching, not stored. | The summary line needs a unit per file type, and it belongs on the file, not repeated on 50k records. |
| D11 | **Location in the repo** | `NameTrace/` in this monorepo, built on branch `claude/peaceful-bohr-ff184f`. Risk level: GREEN (no backend, no stored data). context-keeper adds it to `PORTFOLIO.md` at the end. | Matches how the other apps are organised. No deploy is part of this brief. |

---

## 2. Architecture

```
┌──────────────────────── main thread (UI only) ─────────────────────────┐
│ React 19 app                                                             │
│  ├─ FileStore (useSyncExternalStore): files, status, progress, records   │
│  ├─ SearchIndex per file (built when parse completes)                    │
│  ├─ useSearch(query, opts) → debounced 140 ms / Enter → matcher          │
│  └─ lazy chunks: exporters (csv, pdf, copy)                              │
└──────────┬──────────────────────────────────────────────────────────────┘
           │ postMessage {file: ArrayBuffer (transferred), name, type}
┌──────────▼──────────── parse worker (one per file, max 2 at once) ─────┐
│ detectType → dynamic import(parser) → emits {progress} … {done, records,│
│ warnings} | {error}.  Removing a file = worker.terminate() (real cancel)│
│  pdf  → pdfjs-dist 4.10.x (+ nested pdf.worker)                          │
│  docx → mammoth → mammoth-html tokenizer                                  │
│  csv/tsv → papaparse   xlsx/xls/ods → SheetJS 0.20.3 (CDN tarball)       │
│  json, txt/md/log → hand-written                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

- **The first load ships only the UI.** Each parser is a `import()` inside the worker, and the
  worker itself is only created when the first file is dropped. Exporters are `import()`ed
  on first click. I'll check this by inspecting the build output
  (`vite build` chunk list), and the first-load JS budget is a Playwright assertion on the
  network log.
- **One worker per file** makes cancel-on-remove trivial and keeps a crash to one file.
  A small queue caps it at 2 at once so ten dropped PDFs don't swamp memory.
- **Size check (60 MB)** happens on `File.size` before reading anything.

### File structure

```
NameTrace/
  index.html                 CSP meta, root
  package.json  vite.config.ts  tsconfig*.json  vitest.config.ts  playwright.config.ts
  src/
    main.tsx  App.tsx  index.css            (@import "tailwindcss"; @theme tokens)
    model/types.ts                          NormRecord, ParsedFile, MatchSpan, SearchResult
    match/
      normalize.ts                          fold accents/case, OSA distance (bounded)
      tokenize.ts                           tokens + gaps with original offsets, cached
      query.ts                              parse query ("Last, First" → parts)
      smart.ts                              variant/fuzzy span finder
      exact.ts                              literal whole-word regex builder
      index.ts                              inverted index + search(records, query, opts)
      *.test.ts
    parse/
      worker.ts                             message protocol, dispatch, progress
      detect.ts                             extension + magic bytes → type or error
      pdf.ts  pdfLayout.ts                  (layout = pure line/paragraph rebuild, unit-tested)
      docx.ts  mammothHtml.ts               (tokenizer, unit-tested)
      csv.ts  xlsx.ts  json.ts  text.ts
      *.test.ts
    state/fileStore.ts  state/useSearch.ts
    ui/
      Header.tsx  DropZone.tsx  SearchBox.tsx  FileList.tsx  Filters.tsx
      ResultsHeader.tsx  ResultCard.tsx  FieldGrid.tsx  Highlight.tsx
      Preview.tsx  MobileDrawer.tsx  EmptyState.tsx  Spinner.tsx  ExportBar.tsx
      summary.ts                            pluralised sentence builder (unit-tested)
    export/csv.ts  export/pdf.ts  export/copy.ts   (+ tests for csv escaping/BOM)
  scripts/make-fixtures.ts                  generates every fixture file
  fixtures/                                 generated output (committed, small)
  e2e/nametrace.spec.ts                     Playwright + axe
  README.md
```

---

## 3. Data model

```ts
type NormRecord = {
  id: string;             // `${fileId}:${index}`
  fileId: string;
  fileName: string;
  index: number;          // order within the file
  group: string;          // unit used in counts: "Page 3", "Sheet Payroll", heading, JSON path
  source: string;         // "Page 3, paragraph 2" · "Sheet “Payroll”, row 14" · "incidents[3]"
  kind: 'text' | 'record';
  text: string;           // for records: field values only, joined with " | "
  fields: [key: string, value: string][] | null;
};

type ParsedFile = {
  id: string; name: string; type: FileType; size: number;
  status: 'queued' | 'parsing' | 'done' | 'error';
  progress: number;       // 0..1
  unit: { one: string; many: string };      // D10
  records: NormRecord[]; warnings: string[]; error?: string;
};

type MatchKind = 'exact' | 'variant' | 'fuzzy';
type MatchSpan = { start: number; end: number; kind: MatchKind };   // offsets into record.text
type SearchHit = { record: NormRecord; spans: MatchSpan[]; best: MatchKind };
```

Field-level highlighting: `text` is built as `v1 + " | " + v2 …`, so each field's offset
range is known from the value lengths. Spans are mapped back to fields with a cumulative
offset table. A span can never cross a field, because " | " breaks a name (see §5).

---

## 4. Parsers

| Type | Library | Records | `group` / `source` |
|---|---|---|---|
| PDF | pdfjs-dist **4.10.38** (pinned exactly) | one per paragraph | `Page 3` / `Page 3, paragraph 2` |
| DOCX | mammoth 1.12 | heading, paragraph, list item, table row (row 1 = headers → fields) | current heading / `Associates, table 1, row 2` · `Associates, paragraph 4` |
| CSV/TSV | papaparse 5.7 | one per data row | file name / `Row 14` (= line number in the file, header is line 1; multi-line quoted cells counted correctly via the parser's cursor) |
| XLSX/XLS/ODS | SheetJS 0.20.3 (CDN tarball) | one per non-empty row per sheet | `Sheet Payroll` / `Sheet “Payroll”, row 14` from `__rowNum__ + 1`. The header row is the first non-empty row |
| JSON | native `JSON.parse` | each object in any array → record (dot-path flattened); leftover scalars at each object level → one record | JSON path / `incidents[3]`, `$` for the root |
| TXT/MD/LOG | — | blocks split on blank lines; line-by-line if there are no blank lines or a block is all bullets | `Block 4` / `Paragraph 4 (line 12)` |

**PDF layout (pure function `layoutPage(items) → paragraphs`, unit-tested with synthetic
items):**
1. Sort items by baseline y (tolerance of 0.5 × font height), then by x.
2. Rebuild a line: insert a space when `gap > 0.25 × avgCharWidth(font size)` and neither side
   already has whitespace. Never join blindly, and never add a space inside a word
   split into two items.
3. Line gaps: the median of consecutive baseline deltas on the page. A new paragraph starts when
   `delta > 1.45 × median`, or when the line starts with a bullet (`•·▪–-*` or `\d+[.)]`).
4. Hyphen rejoin: a line ending in `[a-z]-` followed by a line starting in lowercase is merged
   without the hyphen. (Real compound hyphens before a capital or a digit are kept.)
5. Progress is posted after each page.
6. If a page has no text items → count it. If *every* page is empty, return the warning "This PDF
   looks scanned (no text layer). Run it through OCR first, then try again." If only some
   pages are empty, the warning lists which pages were skipped.
7. `PasswordException` → the error "This PDF is password-protected. Open it, save an
   unprotected copy, and try that."

**Unsupported types** get specific messages: `.doc` → "Save it as .docx in Word",
`.ppt/.pptx` → "Export it as PDF", `.pages/.numbers` → "Export as PDF or .xlsx",
images → "NameTrace reads text, not images. Run OCR first", and anything else → a list of
supported types. Detection uses the extension plus magic bytes, so a renamed file gets a clear
error instead of garbage.

**Fixtures** come from `scripts/make-fixtures.ts` (run with `tsx`, committed output):
- CSV/TSV/TXT/MD/LOG/JSON: written as text (including a multi-line quoted CSV cell, an accented
  name, "Connor, Sarah", and a must-not-match "John Connor. Sarah Smith").
- XLSX/ODS: SheetJS `writeFile` with two sheets and a blank row at the top, so the real row number
  ≠ the array index.
- DOCX: the `docx` npm package (dev only), with headings, a list, and a table.
- PDF: jsPDF (already a dependency) with 3 pages, a word hyphenated across lines, bullets, and a
  larger paragraph gap; plus an **image-only PDF** (scanned case) and an **encrypted PDF**
  (jsPDF `encryption.userPassword`).
- Tests assert record counts and exact `source` labels for each fixture. Parsers take an
  `ArrayBuffer`, so they run under Vitest in Node (pdf.js via its legacy build in tests only).

---

## 5. Matching engine (pure, fully unit-tested)

**Tokeniser**: `/[\p{L}\p{M}\p{N}'’-]+/gu`. A single-letter token directly followed by `.` is
an *initial* and absorbs the dot. For every token it stores `start/end` in the original
text, `folded` (NFD, strip `\p{M}`, lowercase), `foldedCase` (accents stripped, case kept) and
`gapBefore` (the raw text between it and the previous token). The result is cached in a
`WeakMap<NormRecord, Token[]>`.

**Allowed joiners (the gap between two consecutive name parts):** whitespace only;
whitespace with exactly one `,`; empty (after an initial's absorbed dot); or exactly `.` / `_`
with no whitespace (emails and handles). **Everything else breaks the name**: `. ` after a
full word (a sentence end), `|` (the field separator), `;`, `:`, `/`, `(`, newlines
with punctuation, and so on. This one rule deals with the "fuzzy across sentence boundaries" trap:
a candidate sequence is only assembled from consecutive tokens whose gaps pass.

**Query**: trim; if it contains a comma → `Last, First Middle` becomes `First Middle Last`. Parts
= tokens; surname = the last part.

**Smart mode**: for a query of parts P1…Pn (n ≥ 2), try at each token position:
- `exact`: tokens match P1…Pn in order, all folded-equal and the original text also
  equal (apart from accents) → *Exact*. Accent-only differences (José / Jose) are Exact too,
  as the brief says.
- `variant`:
  - reversed: `Pn [,] P1 … Pn-1`
  - one extra token (a middle name or initial) anywhere between P1 and Pn
  - an initial (`S` or `S.`) in place of any *non-surname* part
  - email/handle: the same order joined by `.`/`_` (e.g. `sarah.connor@…`, `sarah_connor`)
- `fuzzy`: the same shapes, but with at least one part matched by OSA distance within budget
  (≤3 chars: 0, ≤5: 1, else 2) and none failing. Initials never count as fuzzy. Plus D7 if
  approved.
- Single-word query: whole-token match with the stricter budget (≤4: 0, ≤7: 1, else 2).
- Case-sensitive mode: compare `foldedCase`. A token that's equal when lowercased but differs in
  case is a **miss**. For fuzzy, the distance on case-kept strings must equal the distance on
  lowercased strings (casing never pays for an edit).
- The span goes from the first matched token's start to the last one's end, in original offsets.
  Overlapping candidates are resolved as best kind first, then longest.

**Exact mode**: escape the query, replace whitespace runs with `\s+`, and wrap in
`(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])`, with the `u` flag plus `i` unless case-sensitive.
It's literal, so it is accent-sensitive, and `\s+` can't cross ` | `.

**Performance (D6)**: `SearchIndex` maps `folded token → Uint32Array of record positions`. It
is built once per file in the worker and posted back with the records. Per query:
candidates for each part = the exact key + keys within budget (a length prefilter
`|len(a)-len(b)| ≤ budget`, then bounded OSA with early exit) + initials. Records = the union of
postings for surname candidates (or the single part) → run the span matcher on those only.
Benchmark: `match/bench.test.ts` builds 50k synthetic records (random names and filler) and
records the p50/p95 per query for 5 queries in both modes. **Target: p95 < 100 ms.** The
result goes in the phase 1 report.

**Tests (a sample of what "every rule" covers)**: exact; accents; reversed with/without a comma;
middle name; middle initial; initial for the first name; `sarah.connor@x.com`; `sarah_connor`;
"Last, First" query; typo budgets at each length boundary; single-word budgets;
**must-not-match**: `John Connor. Sarah Smith`, `Sarah | Connor`, `Sarah; Connor`,
`Sarahs Connorville`, case-sensitive `sarah connor`, two middle names; span offsets
checked with `text.slice(start, end)` in every test.

---

## 6. UI

- Tailwind v4 `@theme`: `--color-obsidian #090D0B, --color-charcoal #0F1914,
  --color-surface #14241B, --color-edge #213E2E, --color-accent #10B981, --color-mint #34D399,
  --color-ink #ECFDF5, --color-muted #9CA3AF`, plus `--font-sans` (Inter) and
  `--font-serif` (Source Serif 4). Document text always uses `font-serif`.
- **Layout**: `lg:` two columns (left 380 px: drop zone, search, file list, filters, export;
  right: results). `2xl:` results and the sticky preview side by side. Below `lg`: a single
  column, the search box sticky at the top, filters in a `<details>`-style collapsible, and the preview
  in a bottom-sheet drawer (focus-trapped, Escape closes, swipe is not required).
- **Search**: 56 px input, a ✕ clear button, Escape clears, `/` and Ctrl/Cmd+K focus it (ignored while
  typing in another field). 140 ms debounce; Enter searches immediately.
- **Results header** from `summary.ts`: "Found 14 entries matching “Sarah Connor” across 3
  pages and 2 sheets in 2 files" and "12 exact, 2 possible typos". Every count is pluralised,
  and zero categories are omitted.
- **Result card**: file name (when there are several files), source, badge (Exact / Name variant / Possible
  typo), "3 mentions", a snippet cut at word boundaries around the first span plus "Show full
  text"; structured rows show a field grid with the matched fields first.
- **Highlight**: `<mark>` with `bg-mint/20`, a 1 px inset mint ring and a soft glow; fuzzy spans get a dashed
  outline instead. The kind is also exposed as `title` / sr-only text, not only by colour.
- **Preview**: the selected hit plus 2 neighbouring records before and after (same file), or the
  full field table. With nothing selected: a numbered list of how the current file was split.
- **Files**: a per-file progress bar, warnings (amber), errors (red), a remove button, and a
  scope selector: "All files" or a single file.
- **States**: an animated dashed emerald drag border that scales to 1.01; an emerald pulse spinner;
  empty states for no file, still parsing, no query, and zero matches. Zero-match suggestions depend on the toggles
  ("Turn off Exact match only to include variants and typos", "Turn off Case sensitive",
  "Try only the surname").
- The header says "Files stay on this device". Copy is in sentence case with no arrows. `motion-reduce:`
  disables the animations. `focus-visible:` rings are on everything.

---

## 7. Export (lazy-loaded)

- **CSV**: `File, Location, Match type, Matched text, Content, <union of field keys in
  first-seen order>`. `﻿` BOM, RFC 4180 quoting, and a `'` prefix on cells starting with
  `= + - @` (and tab/CR, per OWASP). The file name is `nametrace-<query>-<date>.csv`.
- **PDF**: jsPDF + jspdf-autotable, landscape A4, a dark title band (query + summary), a
  results table, "Page n of N" footers, and the D9 character handling.
- **Copy all**: `navigator.clipboard.writeText` when `isSecureContext`, otherwise the hidden
  `<textarea>` + `execCommand('copy')` fallback. The button shows "Copied" for 2 s (an aria-live
  announcement).

---

## 8. Known traps: how each is handled

| Trap | Handling |
|---|---|
| pdf-parse is Node-only | Not used. pdfjs-dist 4.10.38 (browser build), with the worker via `?url` (D5). |
| DOCX with DOMParser won't work in a worker | mammoth (no DOMParser) + our tokenizer for mammoth's fixed HTML subset (D4). The tokenizer is unit-tested in Node, where DOMParser doesn't exist either, so a regression is caught. |
| Fuzzy matching across sentence boundaries | Candidates are only built from consecutive tokens joined by the allowed gaps (§5). Sentence ends, ` | `, `;` and so on break a name. There are explicit must-not-match tests. D7 also tightens the typo matches that are allowed. |
| Large XLSX freezes the main thread | All parsing is in the worker. SheetJS is read with `dense: true` to cut memory. Rows are converted one sheet at a time, with progress per sheet. There is a 60 MB cap. |
| jsPDF default fonts can't render non-Latin | Detect, substitute and warn in the UI and the PDF footer, and point to CSV (D9). Listed in README limits. |
| (extra) the index is too slow at 50k records | The inverted index plus candidate prefilter (D6), measured with a benchmark test. |
| (extra) third-party requests | Self-hosted fonts (D2) and CSP `connect-src 'self'` (D3), asserted in e2e. |

---

## 9. Phases and done criteria

Each phase ends with `npm run build` + `npm test` green, a commit, and a push to
`claude/peaceful-bohr-ff184f`.

1. **Scaffold + theme + matcher.** Vite 8, React 19, TS 5.9, Tailwind 4 theme, and the matcher with
   its full test suite and the 50k benchmark. *Report: test count, benchmark numbers.*
2. **Parsers + fixtures.** The fixture script, all parsers, and count/label tests per format.
3. **Worker.** Protocol, queue (2 at once), progress, cancel-on-remove, and index built in
   the worker. Decide on a search worker from the phase 1 numbers.
4. **UI.** Everything in §6.
5. **Export.** CSV (tested: BOM, escaping, injection), PDF, copy.
6. **E2E.** Playwright on the preinstalled Chromium: upload every fixture, search "Sarah
   Connor", assert the count and summary, toggle Exact, export CSV and check the header, run axe (fix
   serious/critical), assert no off-origin requests, and take screenshots at 1440 and 390 px with
   my critique.
7. **README.** Run, matching rules, limits (scanned PDFs need OCR, heuristic paragraphs,
   no .doc, Latin-only PDF export).

### Pinned versions (checked against the npm registry today)
react/react-dom 19.3 · vite 8.3 · @vitejs/plugin-react 6.1 · tailwindcss +
@tailwindcss/vite 4.3 · typescript 5.9.3 · pdfjs-dist **4.10.38** · mammoth 1.12 ·
papaparse 5.7 · xlsx from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` · jspdf 4.2 ·
jspdf-autotable 5.0 · lucide-react · vitest 5 · @playwright/test (set to the preinstalled
Chromium) · @axe-core/playwright · dev: docx, tsx.

---

## 10. As built: differences from this plan

| Area | Plan | As built | Why |
|---|---|---|---|
| D7 typo policy | First letter + ≤2 total edits | Also: 6–7 letter parts get **1** edit (2 only from 8 letters) | The plan's claim was wrong: “Connor” → “Cannon” keeps the first letter, so the first-letter rule alone didn't stop it. Tests now prove “Sarah Cannon” is rejected by default and accepted under `'brief'`. |
| Bracketed names | Brackets break a name | A single bracketed word is part of the name, and bracketed query parts are optional | A real export's “Leader at 1728” value had the form `First (nickname) Last` and couldn't match itself (0 of 3 rows). |
| Column scope | Not in the brief | **Column** picker plus value suggestions; matching limited to one field | The owner filters by “Leader at 1728”. A plain name search also hits attendees and other columns. |
| D8 paging | 200 cards | **100** cards per page | Rendering is the largest part of a search on big files. |
| D6 search worker | Decide after measuring | **Stays on the main thread** | 50k records: p95 ≈ 51 ms. 100k rows in Chromium: 36–187 ms from Enter to render. |
| Worker hand-off | One “done” message | Records in batches of 2,000; index packed into transferable typed arrays; repeated strings interned; columns computed in the worker | One structured clone of 100k records froze the page for ~1.1 s. Now the worst task is 50–140 ms, mostly garbage collection. |
| Build | — | `vite.config.ts` forces `NODE_ENV=production` for builds | This environment's `NODE_ENV=development` was shipping React's dev build (495 KB → 273 KB first load). |
| XLSX row numbers | `__rowNum__` | Rows read with column-letter keys (`header: 'A'`) | `__rowNum__` exists only on object-mode rows, not `header: 1` arrays. |

---

## 11. Guided tour (added 2026-09-26)

**Request (owner):** “on the website create a step by step tour guide of how to use the website”.

**Scope**
- A 9-step tour opened by **Take the tour** in the header and **New here? Take a 1-minute tour** on the empty start screen. The steps: welcome and privacy, add files, type a name, read the results, see it in context, narrow it down, check your files, export, done.
- Each step spotlights its part of the page (`data-tour` markers) with a card placed beside, below or above it. Where the target is hidden, the card is centred.
- Hands-on: step 2 can load four sample files and step 3 can run “Sarah Connor”, so later steps have real results. The samples are copies of synthetic fixtures, generated by `scripts/make-fixtures.ts` into `public/samples/` and fetched from the same origin. CSP is unchanged.
- Accessibility: `role="dialog"` with focus moved to the card, arrow keys and buttons, Esc to close, focus returned to the opener, reduced motion respected.
- The tour never starts by itself and stores nothing (no localStorage).
- Supporting change: the phone header badge is shortened to “Stays on device” so the new Tour button fits on one line at 390px.
- README “How to use it” section. `e2e/tour.spec.ts`: full walkthrough on desktop and mobile, card within the viewport at every step, axe with the tour open, focus return, no off-origin requests.

**Out of scope:** auto-starting the tour, remembering that the tour was seen, and changes to parsing, search or export.

---

## 12. Leader view: “everyone under one Leader at 1728” (added 2026-09-26)

**Why:** the owner’s real job is not “find a name anywhere”. It is: pick a leader at 1728 and see
everyone under them. That was possible only through Column → value chip, three clicks deep, and it
listed raw rows instead of people. The owner confirmed two defaults: **one line per person**, and
**close variants of a leader’s name are included but marked**.

**Scope**
- A **Leaders | Find a person** switch at the top of the left column. Leaders is the default
  whenever a loaded spreadsheet has a leader column. Find a person is the existing name search,
  unchanged.
- **Leader column:** auto-detected (`Leader at 1728` first, then any column containing “leader”),
  with a picker when there is more than one (for example Leader at 144).
- **Leader list:** every leader with people and record counts, and a filter box. Spellings of the
  same leader are grouped with the existing smart matcher (bracketed nickname, small typo) and
  shown as “also written as …”. Rows with no leader are grouped as “No leader listed”.
- **People under a leader:** one card per person, deduplicated by the Full Name column (folded
  accents, case and spacing). Each card shows contact details (mobile, email, address), every event
  with its type and date, the number of visits, and a mark when a row’s leader was written
  differently. People can be filtered by name and sorted by name, most visits or latest visit.
- **Export follows the view:** in Leaders, CSV, PDF and Copy export the selected leader’s people
  (one row per person). In Find a person they export search results as before.
- **Tour rewritten** around this flow, with a richer generated sample roster: several leaders,
  repeat visitors, and one leader written two ways.

**Out of scope:** editing data, leaders at 12/144 as a hierarchy tree, and saving anything.
