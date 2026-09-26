# Handoff — Profound-Productions-Projects monorepo — 2026-09-26

Branch `claude/peaceful-bohr-ff184f` (pushed, no PR opened). One section per project; keep other projects' sections when editing.

---

## NameTrace (folder `NameTrace/`) — GREEN

### State
- Client-side-only web app (Vite 8, React 19, Tailwind 4, TS 5.9). Reads PDF, DOCX, XLSX/XLS/ODS, CSV/TSV, JSON, TXT/MD/LOG in a Web Worker and finds every mention of a person's name: exact matches, name variants, and possible typos.
- No backend, database, Supabase or Vercel project. The CSP blocks requests to other origins, and an e2e test checks this.
- All 7 build phases are done and pushed (commits `893f9d4` plan through `8d8505a` README). 95 unit tests and 7 Playwright e2e tests pass. axe reports no serious or critical issues.
- **Not deployed.** No PR is open.
- Main real-world use: church roster exports, filtered by the "Leader at 1728" column.

### Decisions (and why) — newest first
- `vite.config.ts` forces NODE_ENV=production for builds. The build environment had NODE_ENV=development, so React's dev build shipped.
- Search runs on the main thread. Measured p95 was about 51 ms at 50k records, and 36–187 ms end-to-end at 100k rows.
- Added a column picker to support the Leader-at-1728 workflow.
- A single bracketed word counts as part of a name. Without this, a real value like "First (nickname) Last" could not match itself.
- Strict typo policy by default: the first letter must match, name parts of 6–7 letters allow 1 edit, and a name allows at most 2 edits in total. The brief's budgets matched "Sarah Cannon" for "Sarah Connor". You can switch to 'brief' in `src/match/smart.ts`.

### OPEN decisions (need the owner)
- **a. Typo policy:** keep strict, or switch to the brief's budgets? Options: strict (recommended, fewer false positives) / brief. Nothing is blocked; it's a one-line switch.
- **b. Deploy?** Options: a new Vercel project / keep it local-only. If you deploy, follow the release order in CLAUDE.md (qa-tester, then gatekeeper-reviewer, then your approval). Recommended: try it locally first. Blocks any live URL.
- **c. Open a PR** for this branch into main? Recommended: yes, once (a) is settled. Blocks merging.
- **d. Unicode font for non-Latin names in the PDF export** (adds about 400 KB or more)? Recommended: not until a roster actually needs it, since the CSV export already keeps every character.

### Next step
`cd NameTrace && npm install && npm run dev`. Load a real roster export locally, then decide (a) and (b).

### Gotchas
- **The monorepo is PUBLIC.** Never commit real exports, since they contain personal data covered by POPIA. All fixtures are synthetic.
- The git-ignored local check `NameTrace/src/testing/real.local.test.ts` runs against real data and prints aggregates only. Keep it that way.
- Known limits:
  - Scanned PDFs need OCR.
  - PDF paragraph detection is heuristic.
  - `.doc` files are not supported.
  - The PDF export is Latin-only (the CSV export keeps everything).
  - Hyphenated first names don't match their unhyphenated form.
  - Only Chromium has been tested.
  - Memory use was not measured beyond 100k rows.

---

## network-growth (Supabase `whvmbftpbrqkygnltvvz`) — RED

- Checked read-only this session and **nothing was changed**. The database is healthy, but all 6 tables are empty. No app or frontend exists in GitHub, Vercel, or (per the owner) the owner's PC. "Name trace project" meant NameTrace, not this.
- **Open risk:** `allowed_emails` is empty, and its insert policy lets the first signed-in user add themselves (the `allowlist_empty()` bootstrap). So **whoever signs in first becomes admin**. Advisors also flag two more issues:
  - `is_allowed()` and `allowlist_empty()` are SECURITY DEFINER and can be executed by anon and authenticated users.
  - There are two `auth_rls_initplan` warnings on `allowed_emails`.
- Low urgency while the database is empty and has no app. **Fix before any data goes in**, via schema-keeper on a Supabase branch, with owner approval.

---

## CampusHustle, now branded "The Business Corner" (Supabase `ulbzuafadfxdymrtdzgy`, Vercel `hustle-corner`) — GREEN

### State
- **Deploy source is the separate GitHub repo `th4ndO/Hustle-Corner-` (branch `main`), not the monorepo folder `Hustle-Corner/`.** The monorepo folder is an old snapshot: it still says "CampusHustle" and has the old verification and privacy text. Don't edit it expecting changes to go live.
- Live site https://hustle-corner.vercel.app still serves `dpl_CyEbTsZkJeqxjdHTfdtcXhmnoYTk` (commit `efe50f2`). Production was **not** redeployed this session.
- Builds were fixed (with the owner's explicit yes). On 2026-09-25 at 19:18 UTC, about 50 min after the last good prod deploy, someone set the Vercel `hustle-corner` Root Directory to `groundwork`. After that every build failed with `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST`. It has been reset to the repo root through the Vercel API.
- Step-by-step guide built on branch `claude/loving-brown-e2pvis` of `th4ndO/Hustle-Corner-` (commit `3a9634e`). **No PR is open.**
  - New `/how-it-works` page with two tabs: `?for=customers` (7 steps) and `?for=business` (10 steps).
  - Logged-in users now get a "Dashboard" link in the header. Before this, nothing linked to `/dashboard`, so new sellers couldn't find onboarding.
  - Account links are grouped so they wrap as one row on phones.
  - The footer and homepage link to the guide.
  - Homepage copy fixed: it wrongly said you can't book through the site.
- Checks: `tsc` and the production build pass. In Chromium at 360px and 1024px there is no horizontal overflow. **The logged-in header was simulated, not tested with a real account.**
- Preview (READY): https://hustle-corner-g7l5am7z0-profoundproductionss-8104s-projects.vercel.app/how-it-works (`dpl_HAb4JhyMayEXvhivAZDJebneZg3X`).

### Decisions (and why) — newest first
- Reset the `hustle-corner` Root Directory to the repo root. The `groundwork` value broke every build and most likely belonged to the ACADEMIC Groundwork project.
- Signup no longer checks student email domains, so every signup gets `is_verified=true` **on purpose** (owner's decision, commit `5e9fdd1` in `Hustle-Corner-`). This is not a bug.
- Privacy contact and legal review are parked. The owner said "get it working first".

### OPEN decisions (need the owner)
- **a. Monorepo folder `Hustle-Corner/`:** re-sync it from `th4ndO/Hustle-Corner-`, or delete it or mark it as a snapshot? Recommended: mark it as a snapshot (or delete it) so nobody edits the wrong copy. Nothing is blocked, but it will keep misleading future sessions.
- **b. Groundwork (ACADEMIC) Vercel project `project`:** its Root Directory was **not** checked, because academic projects are review-only. Should someone check whether `groundwork` was meant for it? Recommended: the owner checks it personally. Until then, Groundwork deploys may also be wrong.
- **c. Ship the guide?** Review the preview first. Recommended: yes, after QA. This blocks the guide from going live.
- **d. (Parked)** The privacy page needs a contact email and a named responsible party. `/terms` needs review by a lawyer or UP Student Affairs.

### Next step
Open the preview link above and click through both tabs on a phone. If it looks right, follow this release order: qa-tester, then gatekeeper-reviewer, then owner approval, then open a PR from `claude/loving-brown-e2pvis` and merge it to `main` in `th4ndO/Hustle-Corner-`.

### Gotchas
- A local `next build` needs `NODE_ENV=production`. The container sets `NODE_ENV=development`, which makes the build fail with "<Html> should not be imported outside of pages/_document".
- Sellers get **no notification** when someone requests a booking. The guide tells users this. It's a product gap, not yet fixed.
- The Supabase migration history on the live DB doesn't match the repo's migrations folder. Make any schema change through schema-keeper, and reconcile the two first.
- The site stores sellers' WhatsApp numbers (personal data). Keep RLS on and don't print rows.
