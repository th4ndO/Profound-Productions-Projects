# Handoff — Profound-Productions-Projects monorepo — 2026-10-02

One section per project; keep other projects' sections when editing. NameTrace and Groundwork both deploy from `main` of this monorepo. Groundwork: nothing in flight (last merged: #40).

---

## NameTrace (folder `NameTrace/`, Vercel `nametrace`) — AMBER

### State
- Client-side-only web app (Vite 8, React 19, Tailwind 4, TS 5.9). Reads PDF, DOCX, XLSX/XLS/ODS, CSV/TSV, JSON, TXT/MD/LOG in a Web Worker and finds every mention of a person's name: exact matches, name variants, and possible typos.
- No backend, database or Supabase. The CSP blocks requests to other origins, and an e2e test checks this.
- **Live** at https://nametrace-green.vercel.app (merge to `main` deploys), including the Leaders view (PR #19). See PORTFOLIO.md for history.
- **PR #29 merged** (`a1f7d31`, 2026-09-27) and live on both `nametrace` and `project` (production READY; live smoke test passed: samples load, Thabo Nkosi shows 5 people, search works, no off-origin requests):
  1. Build-skip rule (PR #29, **fixed by PR #42**): the #29 form failed every NameTrace deploy once its last deploy commit fell outside Vercel's shallow clone (`git diff` exits 128, and Vercel treats anything but 0/1 as an error). Current `ignoreCommand` in `NameTrace/vercel.json` and `Project/vercel.json`: `if [ -n "$VERCEL_GIT_PREVIOUS_SHA" ] && git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA^{commit}" 2>/dev/null && git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- .; then exit 0; else exit 1; fi`. It only ever exits 0 (skip) or 1 (build); a missing commit builds. **Never let this command exit anything else.**
  2. Deterministic fixtures: `make-fixtures.ts` pins the PDF date and file ID and rebuilds the DOCX zip with fixed dates; jszip 3.10.2 added as an exact devDependency.
- Main real-world use: church roster exports, filtered by the "Leader at 1728" column.

### Decisions (and why) — newest first
- Build-skip rule uses `VERCEL_GIT_PREVIOUS_SHA` (PR #29) — the old `HEAD^` fallback could skip a new branch's first preview. PR #42 made it exit only 0/1 after #29's version turned every NameTrace deploy into an ERROR (previous commit missing from the shallow clone).
- Fixtures made deterministic with jszip pinned exactly (PR #29) — mammoth and docx already depend on jszip; regenerating fixtures no longer produces diffs.
- `vite.config.ts` forces NODE_ENV=production for builds. The build environment had NODE_ENV=development, so React's dev build shipped.
- Search runs on the main thread. Measured p95 was about 51 ms at 50k records, and 36–187 ms end-to-end at 100k rows.
- Added a column picker to support the Leader-at-1728 workflow.
- A single bracketed word counts as part of a name. Without this, a real value like "First (nickname) Last" could not match itself.
- Strict typo policy by default: the first letter must match, name parts of 6–7 letters allow 1 edit, and a name allows at most 2 edits in total. The brief's budgets matched "Sarah Cannon" for "Sarah Connor". You can switch to 'brief' in `src/match/smart.ts`.

### OPEN decisions (need the owner)
- **a. Typo policy:** keep strict, or switch to the brief's budgets? Options: strict (recommended, fewer false positives) / brief. Nothing is blocked; it's a one-line switch.
- **d. Unicode font for non-Latin names in the PDF export** (adds about 400 KB or more)? Recommended: not until a roster actually needs it, since the CSV export already keeps every character.

### Next step
Nothing in flight. Pick up open decisions a or d when the owner wants them.

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

Reclassified 2026-09-26 from "Recipe Costing Planner (academic)": the owner answered "personal project" (confirmed directly; shipped with #15). Registry entry updated.

### State (production = `main`; a merge to main deploys)
- Live at https://project-tau-self-69.vercel.app. Vercel project `project` is linked to this monorepo (root `Project/`). Nothing in flight; last merged #40 (`c599f27`). #34–#40 were all checked on the live site.
- **Accounts (#38, live 2026-09-29):** every browser starts with an anonymous Supabase account via `/start`. Optional email + password on top:
  - Settings → Your account → "Save my account" upgrades the anonymous account in place (same user, data kept).
  - `/sign-in` (public) is for other devices. It refuses if this browser's anonymous account has unsaved goals or plans (plans since #40).
  - Saved accounts can change password (current password required) and sign out without erasing. "Sign out of this device" with erase (#18) is for anonymous accounts only.
  - Proof: 13-step browser end-to-end run on live, a local run and a change-password run; all test accounts deleted. Built-in security review (stand-in; security-auditor isn't available in cloud sessions): no findings. gatekeeper-reviewer: PASS.
- **Plan my day (#40, live 2026-09-29):** `/plan` tab. Tasks have a time estimate, must-do / nice-to-do and an optional set time; "Make time for your goals" adds active goals as blocks; "Bring them to today" carries over earlier tasks. `src/lib/planner.ts` lays out the day: pinned tasks stay put, then must-dos, goals, nice-to-dos; 20% cushion on must/nice tasks of 15+ min; 10-min break after ~90 min of work; what doesn't fit is listed with "Move to tomorrow", never squeezed. Day window (default 07:00–22:00) stored in `profiles`. Erase-and-sign-out also deletes `day_tasks`; `/sign-in` refuses if the anonymous account has unsaved goals *or plans*. #40 also made headers wrap on narrow phones (My goals / Goal ideas scrolled sideways at 360 px). DB: migration `day_planner` (applied live after a local-Postgres proof) adds `profiles.day_start`/`day_end` and `day_tasks` (RLS: own rows only; `goal_id` must be the caller's goal). Proof: 12-step browser end-to-end run on live; test accounts deleted.
- **Ideas:** "Daily habits" is first (15 thirty-day habits, #37); "Like Jesus" has 12 goals anchored on the passages where Jesus did them (#35; fasting carries a doctor caution, mentoring says "newer believer"); Spiritual growth is Christian and Bible-centred (#34); all 75 rewards rewritten to be fun and low-cost (#36). #37 also fixed the #35 fasting milestone, which broke the `milestones.title <= 100` limit so adopting it failed (nobody had). `Project/src/lib/ideas.test.ts` now enforces the DB limits: title 80, reward 120, milestone 100.
- Earlier, all live: reminder timing/timezone fixes and installable app (#5), open-redirect fix on `/start?next=` (#15), reminder rules limited to the caller's own goals (#23, DB and app), build-skip `ignoreCommand` (#21; a skipped push shows as CANCELED), weightlifter icon (#33).
- **Daily cleanup (#32):** pg_cron job `cleanup-stale-anonymous-users` (03:17 UTC) deletes only anonymous users older than 30 days who own no data (since #40, `day_tasks` count as data). First run checked 2026-09-28: succeeded, 0 deleted.
- Live outside git: migrations `rls_initplan` and `goal_themes_v2` applied **directly to live** (gate skipped; owner acknowledged); anonymous sign-ins on; leaked-password protection on; Edge Function `send-reminders` v2; Auth settings from 2026-09-29 (see Gotchas).

### Decisions (and why) — newest first
- **Planner uses built-in rules, not AI** (owner, #40) — layout is fixed rules in `src/lib/planner.ts` (covered by `planner.test.ts`); no AI service involved.
- **Optional accounts use email + password, with email confirmation OFF** (owner, 2026-09-29) — Supabase's built-in mailer only reaches project members. So there is no forgot-password email: if someone forgets, the owner asks the Lead to reset it. Accepted risks: someone can register an email they don't own (blocks that email's real owner from signing up, but gives no data access); "email already has an account" reveals that an email is registered. This is the "sharing with friends and family" revisit trigger from the anonymous-risk decision below; the owner chose to go ahead. The other WARNs are still open (OPEN d).
- **Idea rewards are fun and low-cost** (#36): days off, films, food, small buys up to R100–R200. Rule: a reward never undercuts its goal.
- **Spiritual growth ideas are Christian and Bible-centred** (owner, 2026-09-27): each idea is anchored on a Bible verse; "Like Jesus" (#35) is anchored on Gospel passages. The first, faith-neutral set was replaced before anyone adopted it.
- Legacy magic-link email account (no data) **deleted** from production (owner said yes, 2026-09-27).
- App icon: a person pressing a barbell overhead (owner, 2026-09-27). Source `Project/assets/icon.svg`; PNGs rendered by `node scripts/build-icons.mjs` (run from `Project/`).
- Stale-anonymous cleanup deletes only empty anonymous users >30 days old (#32, owner approved 2026-09-27) — resolves accepted WARN (2) without touching anyone with data.
- #23, #32 and #40 migrations proven on local Postgres (17/17, 17/17, 58/58 with earlier tests still 17/17) instead of a Supabase branch — owner accepted each as a one-off (third time for #40); `create_branch` times out (branching probably needs a paid plan).
- **Owner acknowledged that `rls_initplan`, `goal_themes_v2` and early deploys skipped the release gate** (2026-09-26). From now on: schema changes via schema-keeper on a Supabase branch (a local proof only as a one-off the owner accepts each time), and the full release order in `.claude/CLAUDE.md`.
- **Anonymous sign-up risks accepted for the MVP** (owner, 2026-09-26): gatekeeper WARNs (1) anonymous sign-up hardening, (2) no stale-user cleanup (resolved by #32), (3) no per-user usage limits. Why: personal project, no money, RLS separates users. Supabase's default anonymous sign-in rate limit does **not** protect individual visitors, because `/start` signs in from the server (details given to the owner, kept out of this public repo); a burst of visitors may briefly see sign-up errors. Cheapest fixes: CAPTCHA/Turnstile on `/start`, or forward the visitor IP to Supabase Auth. Revisit trigger (sharing with friends and family) reached 2026-09-29; see OPEN d.
- Sign-out erases an anonymous user's data, then signs out (#18) — anonymous accounts can't sign back in, so leftover data would be orphaned.
- Risk GREEN — owner confirmed a personal project; MVP, no money, users' own goal data under RLS.
- `||` not `??` for `NEXT_PUBLIC_*` — Vercel defines them as empty strings; code falls back to committed public literals (`src/lib/supabase/config.ts`).

### OPEN decisions (need the owner)
- **c. Vercel daily quota:** it runs out on busy multi-session days (hit twice on 2026-09-26). Options: batch pushes / upgrade to Pro. Recommended: batch pushes first; the innovator (2026-09-29) also recommends batching Groundwork content weekly instead of one PR per change. Blocks shipping on heavy days.
- **d. Remaining anonymous-abuse WARNs (captcha, per-user limits):** the revisit trigger is reached. Options: add CAPTCHA/Turnstile on `/start` and per-user limits now / keep them accepted while the app is only shared with friends and family. Recommended: keep accepted for now; add CAPTCHA before any public promotion. Nothing blocked.
- **e. Daily checklist with streaks:** offered, not decided. Options: build it / skip. Nothing blocked.

### Next step
The owner installs the app on their phone, saves an account, and checks that one reminder arrives, then tries planning tomorrow in Plan my day. This also closes "real-device push never verified" (innovator's #2 pick for 2026-09-29: verify push, then start using it).

### Follow-ups (not blocking)
- Self-service account deletion: needs the service role or a security-definer RPC, so it goes through schema-keeper.
- `/sign-in` deletes a goal-less anonymous user's leftover profile and push rows *before* checking the password. Minor; move it after a successful sign-in.
- No automated tests for the account server actions (proven by browser runs), the #40 sign-in/erase guards, `startAnonymousSession`, or the proxy public paths.
- Switching between two saved accounts on one device leaves the first account's push subscription behind.
- **Migration version drift (more urgent now):** repo filenames differ from live versions for every migration, now including `day_planner` (repo `20260929120000` vs live `20260929170816`; also e.g. `reminder_rules_goal_ownership` repo `20260927090000` vs live `20260926192241`). `supabase db push` would try to re-run them. Reconcile before the next schema change.
- Planner: no tests for its server actions; optimistic tick state not reset after refresh (cosmetic); tighten the `fixedStart` type check; no drag-to-reorder; no overnight windows or tasks past midnight; no push when a block starts (could reuse reminders).

### Gotchas
- **Supabase Auth settings live outside git**, set via the Management API on 2026-09-29: `mailer_autoconfirm = true`, `password_min_length = 8`, `password_hibp_enabled = true`. `PASSWORD_MIN_LENGTH` in `Project/src/lib/account.ts` must match `password_min_length`. If confirmation is turned back on without an email sender, saving an account breaks.
- The daily cleanup only deletes `is_anonymous = true` users, so saved accounts are safe.
- Advisor `auth_allow_anonymous_sign_ins` (0012) WARNs are expected, including the one on `day_tasks` (anonymous sign-ins are deliberate).
- `Project/.env.production` is committed with public keys only; anything else there is a finding.
- A CANCELED Groundwork deployment usually just means `ignoreCommand` skipped it (no `Project/` change), not a failure.
- Supabase branching (`create_branch`) is unreliable on this plan; plan schema proofs around it.
- **Never run `Project/supabase/tests/*.sql` on production** (e.g. `cleanup_stale_anonymous_users.sql`, `day_planner_rls.sql`): they write to `auth.users`. Local Postgres only.

---

## Vercel/Supabase clash audit and cleanup (2026-09-26)

### State
- **No clashes found.** Each of the 7 remaining Vercel projects has its own domains. Each app with a database uses its own Supabase project (checked against the refs in the live client bundles). No two Vercel projects share a repo plus root dir. No Supabase branches are open. 2 Vercel projects (`nametrace`, `project`) are linked to the monorepo.
- **Not read-only any more.** At the owner's instruction today:
  - The Vercel Supabase integration was limited to `coco-bliss-project-v2`. Verified after: Coco Bliss still has 31 env vars, 13 of them from the integration.
  - The redundant Vercel project `profound-productions-projects` was deleted. Verified: it returns 404, and 7 Vercel projects remain.
  - The non-deploying monorepo copies `Profound-Productions/`, `Creat8ve-Inc/` and `house-sookoo-data-tracker/` were deleted **on this branch** (`claude/gifted-franklin-7o53s5`). The first two were identical to the original repos. house-sookoo couldn't be compared; its files are kept in commit `46a7394`.
- gatekeeper-reviewer PASSed the branch. **The merge to main is awaiting the owner's approval.**
- Registry: see "Clash audit (2026-09-26)" in `.claude/PORTFOLIO.md`. Coco Bliss deploys from `th4ndO/coco-bliss-production-source`.

### Decisions (and why) — newest first
- Deleted the three monorepo copies (owner's instruction) — nobody should edit code that doesn't deploy.
- Deleted Vercel `profound-productions-projects` (owner's instruction) — it rebuilt on nearly every push and served 404 everywhere.
- Limited the Supabase integration to Coco Bliss (owner's instruction) — other projects could otherwise pick up its vars.

### OPEN decisions (need the owner)
- **1. Coco Bliss (RED) second env-var set:** it has a second set of Supabase-integration vars (`SUPABASE_URL`, `POSTGRES_*`, `SUPABASE_SECRET_KEY`), production only. Should we decrypt `SUPABASE_URL`/`POSTGRES_HOST` to confirm they point at `xvpdqldlqbtafcbycwxp`? Options: decrypt and check (recommended; this needs your explicit request, since it's a RED project) / leave it. Nothing is blocked, but it's unverified.
- ~~2. Integration scope~~ — resolved: limited to Coco Bliss (see State).
- ~~3. Stale monorepo copies~~ — resolved: deleted on this branch (merge pending).
- ~~4. Redundant Vercel project `profound-productions-projects`~~ — resolved: deleted.
- **5. Renames** (blocked by session permissions; each needs your approval and must be done by you in the dashboards):
  - Vercel `project` → `groundwork`.
  - Supabase "th4ndO's Project" → `coco-bliss` (RED; cosmetic only, the ref doesn't change).
  - Supabase `campushustle` → `hustle-corner`, or pick one name for CampusHustle / hustle-corner / "The Business Corner".
  - Vercel `nos236-creat8ves-inc` → `creat8ve-inc`. It's a client URL: the existing `.vercel.app` domain should stay attached. Verify after.
  - Monorepo folder `Project/` → `Groundwork/`. The Vercel `project` Root Directory must change at the moment of merge, or Groundwork builds break.
  - Recommended: do the cosmetic ones anytime; do the folder rename only with a planned merge. Nothing is blocked.
- **6. Unregistered monorepo folders:** `E-portfolio`, `MAFIA`, `MamaG-App`, `MamaG-Official`, `MamaGs`, `demo-repo`, `demorepo` are not in PORTFOLIO. For each: risk level (ACADEMIC?) and keep or delete? `demo-repo` and `demorepo` look like duplicates. Until answered, agents shouldn't touch them.
- ~~**7. Every merge to main redeploys both `nametrace` and `project`.**~~ Resolved 2026-09-26 by PR #21: each app's `vercel.json` `ignoreCommand` skips the build when its folder is unchanged.

### Next step
Owner approved merging `claude/gifted-franklin-7o53s5` (2026-09-26). Next: answer 1, 5 and 6, and act on the health-check RED items.

---

## Cross-project items from 2026-09-26 (health-triage and cleanup)

health-triage wrote its brief to `/root/.claude/reports/health-2026-09-26.md` in an ephemeral cloud container; it is probably gone. Key points are below.

### OPEN decisions (need the owner)
- **Profound Productions (AMBER):** framework upgrade pending. Run `npm audit` in `th4ndO/Profound-Productions`, where the code now lives only (the monorepo copy was deleted). Recommended: yes, via branch, preview deploy and your approval.
- **network-growth (RED):** the Supabase security advisor flags two database functions (medium). Details kept out of this public repo; see the advisor or re-run health-triage. Owner: schema-keeper.
- **Leftover branches** (fully merged; this session got 403 deleting them): `claude/beautiful-mccarthy-3l2kh2`, `claude/gracious-sagan-meu582`. Delete them yourself. Do **not** delete `claude/peaceful-bohr-ff184f`: it got a new commit today.
- **Innovator run 2026-09-29** (summary only; no report file): top pick is the two Coco Bliss RED items below (uptime alert; RLS on the 4 backup tables). Also proposed: a private reports repo, and copying the PC-only agents into `.claude/agents` so cloud sessions have them. Owner to decide on each. (Its Groundwork picks are in the Groundwork section.)

### Health check 2026-09-26 (full brief saved outside the repo) — top items
- **[RED] Coco Bliss:** 4 backup tables in the public schema have RLS off, so payment, order and profile data could be exposed to the anon key. Fix via schema-keeper on a branch, plus a POPIA decision via escalation-desk. (Table names kept out of this public repo; see the brief or the security advisor.)
- **[RED] Coco Bliss:** the storefront could not reach Supabase from about 21 to 25 Sep (ENOTFOUND; likely a free-tier pause, ended when the org went Pro). site-medic: check for unfinalised Yoco payments from that window. Add an uptime alert.
- **[RED] network-growth:** SECURITY DEFINER functions `allowlist_empty()` and `is_allowed()` can be called by anon, and the first-sign-in admin bootstrap is still open. Owner: schema-keeper / security-auditor.
- Coco Bliss: `sync_product_stock_from_variants()` can be called by anon.
- Leaked-password protection is off on Coco Bliss and Profound Productions.
- CampusHustle: preview env vars missing. (Seed/test sellers: resolved 2026-10-02, production now has 0 sellers.)
- Groundwork: make sure config values are always strings.

### Gotchas
- Vercel project `profound-productions-projects` (404 on every path, built on every push) was **deleted** on 2026-09-26 with the owner's yes. As one of three projects building on every push, it helped hit the Hobby daily deployment limit that afternoon. The dashboard Ignored Build Step on `project` and `nametrace` (`git diff --quiet HEAD^ HEAD -- .`) is only a fallback: each app's `vercel.json` `ignoreCommand` runs instead (set by PR #29, fixed by PR #42; see NameTrace).

---

## network-growth (Supabase `whvmbftpbrqkygnltvvz`) — RED

- Checked read-only this session and **nothing was changed**. The database is healthy, but all 6 tables are empty. No app or frontend exists in GitHub, Vercel, or (per the owner) the owner's PC. "Name trace project" meant NameTrace, not this.
- **Open risk:** an access-control issue in the database (details kept out of this public repo; see the project's Supabase security advisor). It was described here earlier, so treat it as disclosed.
- Low urgency while the database is empty and has no app. **Fix before any data goes in**, via schema-keeper on a Supabase branch, with owner approval.

---

## CampusHustle, now branded "The Business Corner" (Supabase `ulbzuafadfxdymrtdzgy`, Vercel `hustle-corner`) — GREEN

_Updated 2026-10-02._

### State
- **WORKING, launch-ready MVP** at https://hustle-corner.vercel.app. Code lives only in `th4ndO/Hustle-Corner-` (`main` deploys). Production deploy `dpl_AMKsGYZZ76rktUWieYsUAZiHXXsy` is READY.
- **DB fix applied (2026-10-02):** the owner ran the 48-check rolled-back proof in the SQL editor (48/48 passed), then applied `0015` (is_admin / is_verified_student recursion fix) and `0016` (`get_taken_slots`). Verified live: SECURITY DEFINER, `search_path=''`, grants correct. Production migration history has **no rows** for 0015/0016 (the SQL editor doesn't record them); `supabase/MIGRATIONS.md` in the app repo documents this.
- **Merged:** PR #2 (squash `13a1d34`; recursion fix, return-to-page after login, friendly errors, wizard copy) and PR #3 (squash `55a22b1`, gatekeeper PASS; fail-soft booking widget, unit tests, migration map, new corner-bubble logo in header, favicon, apple icon and share image).
- **Live end-to-end walkthrough PASSED:** business sign-up via the guide's "List your business" lands in the wizard → submit → Pending review → availability added → admin approves → Live; logged-out seller page loads with WhatsApp button and "Log in to request"; customer signs up from the seller page and returns to it → books → Waiting for confirmation → booked slot disappears → review posts → business confirms → customer sees Confirmed. No browser errors. "Delete my account" also passed.
- **Production is empty:** all qa-* test accounts deleted via the app's Delete my account flow; 0 users, 0 sellers, 0 files. **There is no admin account** (see OPEN f).
- Brand identity kit: Design System artifact https://claude.ai/artifact/GCZQFgDrQszqcqcVbtyVLh (private to the owner). Palette, type, brand book, social/print guide, component previews, logo files. Known a11y gaps recorded there and still on the site: faint counters 2.5:1, amber star on white 2.2:1, input borders 1.5:1. Its README "Before it ships" note about the old favicon is **outdated** now the logo shipped.

### Decisions (and why) — newest first
- Owner accepted all 9 Supabase advisor WARNs (lints 0028/0029) on 2026-10-02: `is_admin`, `is_verified_student`, `get_taken_slots`, plus pre-existing `get_review_author_names` and `get_appointment_party_names` (intentional, narrow name-lookup functions).
- Owner accepted no security-auditor review for PRs #2/#3 (agent not available).
- Proof on the live DB inside a rolled-back transaction — Supabase branching isn't available (`create_branch` timed out; probably needs a paid plan).
- The owner runs production SQL, not an agent — the permission system blocks production schema changes from sessions.
- Logo is the "corner bubble" (owner, 2026-10-02): chat bubble, one sharp bottom-left corner, lowercase "bc", amber dot. Bricolage Grotesque only for posters/social/logo; site keeps system fonts.
- Social/print copy must never promise "verified students" — signup marks everyone `is_verified=true` on purpose (owner, commit `5e9fdd1`), so the claim would be false.
- Email confirmation OFF instead of custom SMTP (owner) — the built-in mailer only reaches team members.
- Privacy contact and legal review parked ("get it working first").

### OPEN decisions (need the owner)
- **f. Owner's own admin account (do first):** sign up on the live site, then run the one-off SQL `update profiles set role='admin' where email=...` in the SQL editor. **Blocks approving any real seller.**
- **g. Public display name defaults to the email username (privacy).** `handle_new_user` (migration 0005) sets the display name to the part of the email before the @, and users can't change it, so reviews publicly show it. Options: ask for a display name at sign-up and let users edit it (recommended; needs a migration via schema-keeper + app change) / leave as is. Not done; worth fixing before promoting the site.
- **d. (Parked)** Privacy page needs a contact email and named responsible party; `/terms` needs review (lawyer or UP Student Affairs); custom domain not chosen.
- **e. Logged-in header on a phone** (Dashboard link, wrapped account row) not checked with a real login. Nothing blocked.

### Next step
Owner signs up at https://hustle-corner.vercel.app and promotes that account to admin with the one-off SQL (OPEN f). Then decide on the display-name fix (OPEN g).

### Follow-ups (not blocking)
- Fix the 3 contrast gaps listed in State.
- Update the brand kit README's outdated favicon note.
- Sellers get **no notification** when someone requests a booking (guide says so). Product gap.
- Keep zod validation at least as strict as the DB check constraints (DB errors now show a generic message).
- Offered, not done: profile-picture exports, first social posts, campus flyer from the kit.

### Gotchas
- **Watch Vercel runtime logs for `[getOpenSlots]`** (gatekeeper WARN): the booking widget is fail-soft and simply hides on error, so failures are silent to users.
- 0015/0016 are applied but absent from production's migration history; check `supabase/MIGRATIONS.md` before any `supabase db push`.
- A local `next build` needs `NODE_ENV=production` (the container sets `development`, which breaks the build).
- Stores sellers' WhatsApp numbers (personal data). Keep RLS on and don't print rows.
- Headless Chromium in cloud sessions doesn't trust the proxy CA, so Playwright can't load Vercel preview URLs; test a local prod build of the same commit instead.
