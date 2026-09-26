# Handoff — Profound-Productions-Projects monorepo — 2026-09-26

One section per project; keep other projects' sections when editing. NameTrace lives on branch `claude/peaceful-bohr-ff184f` (pushed, no PR). Groundwork's in-flight fix is PR #15 (branch `claude/loving-mayer-ux3a3m`).

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

## Groundwork (folder `Project/`, Supabase `bvapxwiryuzzbxesbtqo`) — GREEN

Reclassified 2026-09-26 from "Recipe Costing Planner (academic)": the owner answered "personal project". Registry entry updated.

### State (production = `main`; a merge to main deploys)
- Live at https://project-tau-self-69.vercel.app. Vercel project `project` was re-linked today from `th4ndO/project-` to this monorepo (root `Project/`).
- Merged and live:
  - #5: reminders at 23:56–23:59 never fired, and one bad timezone aborted the run for everyone (both fixed); installable-app manifest; `middleware.ts` renamed to `proxy.ts`; RLS policies use `(select auth.uid())`; magic-link sign-in removed, anonymous sessions via `/start`.
  - #6: `??` → `||` for empty env vars (fixed a production outage of `/start`).
  - #7: `/sign-in` and `/auth/callback` redirect to `/`.
  - #8: 11 idea categories (incl. Diet), 28 research-backed ideas with evidence lines.
  - #9: category and time-frame filters are dropdowns.
  - #12: six new goal visuals (garden, moon, lanterns, path, canvas, balloon).
- Live outside git: migrations `rls_initplan` and `goal_themes_v2` applied **directly to live** (no branch, no schema-keeper: the gate was skipped); anonymous sign-ins on; leaked-password protection on; Edge Function `send-reminders` redeployed (v2).
- Housekeeping: #10 merged NameTrace (separate project); #1 and #11 closed as superseded.
- **In flight: PR #15** (branch `claude/loving-mayer-ux3a3m`). Closes an open redirect gatekeeper found (`/start?next=/%5Cevil.com`, `/%09/evil.com`, `/..//evil.com` sent visitors off-site) and a 500 on a repeated `?next=`. Gatekeeper found no code issues in it (41/41 tests pass). It is still BLOCKED only because the owner's GREEN reclassification must be confirmed by the owner directly, not relayed by an agent.

### Decisions (and why) — newest first
- Risk GREEN — owner confirmed a personal project; MVP, no money, users' own goal data under RLS.
- No sign-in; anonymous Supabase account per browser via `/start` (magic-link removed in #5) — its abuse risks are OPEN decision (a).
- `||` not `??` for `NEXT_PUBLIC_*` — Vercel defines them as empty strings; code falls back to committed public literals (`src/lib/supabase/config.ts`).

### OPEN decisions (need the owner)
- **a. Accept or fix the gatekeeper WARNs?** (1) hardening of anonymous sign-up (gatekeeper's retroactive review, 2026-09-26; details kept out of this public repo); (2) no cleanup of stale anonymous users; (3) no per-user usage limits. (4) sign-out is done (owner asked; Settings → "Sign out of this device" erases the user's data, then signs out). Options for (1)–(3): accept for the MVP / fix some. Blocks nothing today; the advisor WARNs stay open until answered.
- **b. Acknowledge that today's schema changes and deploys skipped the release gate.** Future schema changes go via schema-keeper on a branch.

### Next step
Re-run gatekeeper-reviewer on PR #15, then give explicit approval to merge (merging deploys to production).

### Follow-ups (not blocking)
- Tests for `startAnonymousSession` and the proxy public paths.
- Migration version drift: repo files `20260926120000` / `20260926140000` vs live `20260926103801` / `20260926121546`.
- Signed-out anonymous auth users stay behind with no data (deleting auth users needs the service role); pairs with (2) stale-user cleanup.
- App icon is still a flat placeholder.
- Real-device push delivery never verified.

### Gotchas
- Advisor `auth_allow_anonymous_sign_ins` WARNs are expected (anonymous sign-ins are deliberate).
- `Project/.env.production` is committed with public keys only; anything else there is a finding.

---

## Cross-project items from 2026-09-26 (health-triage and cleanup)

health-triage wrote its brief to `/root/.claude/reports/health-2026-09-26.md` in an ephemeral cloud container; it is probably gone. Key points are below.

### OPEN decisions (need the owner)
- **Profound Productions (AMBER):** framework upgrade pending (run `npm audit` in `Profound-Productions/`). Recommended: yes, via branch, preview deploy and your approval.
- **network-growth (RED):** the Supabase security advisor flags two database functions (medium). Details kept out of this public repo; see the advisor or re-run health-triage. Owner: schema-keeper.
- **Leftover branches** (fully merged; this session got 403 deleting them): `claude/beautiful-mccarthy-3l2kh2`, `claude/gracious-sagan-meu582`. Delete them yourself. Do **not** delete `claude/peaceful-bohr-ff184f`: it got a new commit today.

### Gotchas
- Vercel project `profound-productions-projects` 404s on every path but still builds on every push. Decide whether to delete it or disconnect its Git link.

---

## network-growth (Supabase `whvmbftpbrqkygnltvvz`) — RED

- Checked read-only this session and **nothing was changed**. The database is healthy, but all 6 tables are empty. No app or frontend exists in GitHub, Vercel, or (per the owner) the owner's PC. "Name trace project" meant NameTrace, not this.
- **Open risk:** an access-control issue in the database (details kept out of this public repo; see the project's Supabase security advisor). It was described here earlier, so treat it as disclosed.
- Low urgency while the database is empty and has no app. **Fix before any data goes in**, via schema-keeper on a Supabase branch, with owner approval.

---

## CampusHustle, now branded "The Business Corner" (Supabase `ulbzuafadfxdymrtdzgy`, Vercel `hustle-corner`) — GREEN

### State
- **The code lives only in the separate GitHub repo `th4ndO/Hustle-Corner-` (branch `main`), which deploys.** The stale monorepo copy `Hustle-Corner/` was deleted on 2026-09-26 at the owner's request. Every file in it also existed in `Hustle-Corner-` (gatekeeper checked: 87 identical, 10 newer there, plus migration 0014 only there). This repo only ever held a single import commit (`a5ed6de`); the files can be restored from it, and the full history is in `Hustle-Corner-`. The monorepo's Vercel project `profound-productions-projects` builds from the repo root, not this folder (checked 2026-09-26).
- **The how-it-works guide is live (2026-09-26).** PR https://github.com/th4ndO/Hustle-Corner-/pull/1 was merged to `main` as `566bf91` (branch commits `3a9634e` and `4424a0f`). Production deploy `dpl_GNPcFikspwRi8pAF1Z2Aq81DeMLV` is READY. https://hustle-corner.vercel.app/how-it-works returns 200, with no runtime errors in the first hour.
  - `/how-it-works` has two tabs: `?for=customers` (7 steps) and `?for=business` (10 steps). The footer and homepage link to it.
  - Logged-in users get a "Dashboard" link in the header, so new sellers can find onboarding. Account links wrap as one row on phones.
  - Homepage copy fixed: it wrongly said you can't book through the site. `4424a0f` makes the copy say that reviews and reports need a login (this was gatekeeper's finding).
- Release chain: **qa-tester was not available**, so the Portfolio Lead ran QA itself: `tsc`, the prod build, Playwright at 360px and 1024px against a local prod build of the same commit, and curl route checks on the preview. gatekeeper-reviewer gave PASS. security-auditor wasn't needed because auth, payments, uploads, and admin were not touched. The owner explicitly approved the deploy.
- **The logged-in header was only simulated. Nobody has tested it with a real account** (see OPEN e).
- Builds were fixed (with the owner's explicit yes). On 2026-09-25 at 19:18 UTC, someone set the Vercel `hustle-corner` Root Directory to `groundwork`, and every build after that failed with `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST`. It was reset to the repo root through the Vercel API.

### Decisions (and why) — newest first
- Deleted the monorepo's stale `Hustle-Corner/` copy (owner's request) so nobody edits code that doesn't deploy.
- Shipped the guide after QA by the Portfolio Lead, a gatekeeper PASS, and owner approval. qa-tester wasn't available in the session.
- Reset the `hustle-corner` Root Directory to the repo root. The `groundwork` value broke every build and most likely belonged to the ACADEMIC Groundwork project.
- Signup no longer checks student email domains, so every signup gets `is_verified=true` **on purpose** (owner's decision, commit `5e9fdd1` in `Hustle-Corner-`). This is not a bug.
- Privacy contact and legal review are parked. The owner said "get it working first".

### OPEN decisions (need the owner)
- **b. Groundwork (ACADEMIC) Vercel project `project`:** its Root Directory was **not** checked, because academic projects are review-only. Should someone check whether `groundwork` was meant for it? Recommended: the owner checks it personally. Until then, Groundwork deploys may also be wrong.
- **d. (Parked)** The privacy page needs a contact email and a named responsible party. `/terms` needs review by a lawyer or UP Student Affairs.
- **e. Logged-in header check:** the Dashboard link and the wrapped account row were only simulated. Recommended: the owner logs in once on a phone and checks them on the live site. Nothing is blocked, but a broken header would hide onboarding from new sellers.

### Next step
Log in on a phone at https://hustle-corner.vercel.app. Check that the header shows "Dashboard", that the account links wrap as one row, and that `/how-it-works` looks right on both tabs (closes OPEN e).

### Gotchas
- A local `next build` needs `NODE_ENV=production`. The container sets `NODE_ENV=development`, which makes the build fail with "<Html> should not be imported outside of pages/_document".
- Sellers get **no notification** when someone requests a booking. The guide tells users this. It's a product gap, not yet fixed.
- The Supabase migration history on the live DB doesn't match the repo's migrations folder. Make any schema change through schema-keeper, and reconcile the two first.
- The site stores sellers' WhatsApp numbers (personal data). Keep RLS on and don't print rows.
- Headless Chromium in cloud sessions doesn't trust the proxy CA, so Playwright can't load Vercel preview URLs. Test against a local prod build of the same commit instead.
- Branch `claude/loving-brown-e2pvis` in `Hustle-Corner-` is merged. Delete it if it's still there.
