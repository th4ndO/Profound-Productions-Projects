# Portfolio Registry

Source of truth for which project is which, how risky it is, and what agents may do.
The Portfolio Lead (main session) reads this before any work. Context Keeper updates
the **Status** line when a project's state changes.

Anything marked **[CONFIRM]** could not be verified with read-only tools and must be
filled in by the owner.

- Vercel team: `profoundproductionss-8104's projects` (`team_7iL1yrOnIknhqSYPcwGQNhg3`)
- Supabase org: `cnjjasuizkwoestacrxo`
- Cloud monorepo: `th4ndO/Profound-Productions-Projects` (folders listed per project below)
- Last verified: 2026-09-25 (Vercel `list_projects` / `list_project_domains`, Supabase `list_projects`); Groundwork entry re-verified 2026-09-26 (owner answer, Vercel re-link)

## Risk levels

| Level | Meaning |
|---|---|
| RED | Live money or personal data. No deletes, pauses, or writes without the owner's explicit "yes". Schema changes go to a branch first. Never deploy to production directly. |
| AMBER | Live business site. Changes go through branches and preview deploys; production deploy needs owner approval. |
| GREEN | MVP / low stakes. Normal workflow, still branch-first for schema. |
| ACADEMIC | Graded university work. Agents may **review and test only**, never write code, until the owner confirms the module's AI policy. |

---

## Coco Bliss (production)

| Field | Value |
|---|---|
| Supabase ref | `xvpdqldlqbtafcbycwxp` (dashboard name: "th4ndO's Project", eu-west-1) |
| Vercel project | `coco-bliss-project-v2` (`prj_vxGjDBlaxZFA65SOCm59iIeKTvzJ`) |
| Live URL | https://www.cocobliss.co.za (apex `cocobliss.co.za` 308-redirects to www) |
| Repo | GitHub `coco-bliss-production-source` or `CocoBliss---Website` [CONFIRM which one deploys]; local path [CONFIRM] |
| Risk | **RED** |
| Status | Live, taking Yoco payments |

Special rules:
- Live Yoco payments. Never delete, pause, or write to the database without the owner's explicit "yes".
- Payment code (checkout, webhooks, order finalisation) needs tests and gatekeeper-reviewer before merge.
- Deliberately excluded from the cloud monorepo.

## network-growth

| Field | Value |
|---|---|
| Supabase ref | `whvmbftpbrqkygnltvvz` (eu-west-2) |
| Vercel project | none found in the team [CONFIRM: not deployed, or deployed elsewhere?] |
| Live URL | [CONFIRM] |
| Repo | [CONFIRM]. Possibly related: `house-sookoo-data-tracker/` (a client-side church roster explorer, Vercel `house-sookoo-data-tracker`), but it contains no Supabase ref [CONFIRM relationship] |
| Risk | **RED** (POPIA) |
| Status | Backend only: schema exists, tables empty, no frontend found (checked 2026-09-26). First-sign-in-becomes-admin bootstrap still open. |

Special rules:
- Holds church members' personal data (POPIA). Never print individual rows in chat, logs, issues, or reports; aggregates only.
- Imports go through data-steward to a Supabase branch only.
- Never write to it without the owner's explicit "yes".

## Profound Productions

| Field | Value |
|---|---|
| Supabase ref | `ofbitzqczupdobofuosh` (eu-west-1) |
| Vercel project | `profound-productions` (`prj_eURPeIAzqOKDCWhKgugcX6ID9oB9`) |
| Live URL | https://profound-productions.vercel.app (no custom domain attached) [CONFIRM intended domain] |
| Repo | monorepo folder `Profound-Productions/` (from `th4ndO/Profound-Productions`); local path [CONFIRM] |
| Risk | **AMBER** |
| Status | Live studio site: portfolio plus a password-protected /admin panel |

Special rules:
- Hosts the Care Plan business; the care-plan-runbook skill covers client sites.
- The /admin panel writes to Supabase, so auth and RLS changes need gatekeeper-reviewer.

## CampusHustle (branded "The Business Corner")

| Field | Value |
|---|---|
| Supabase ref | `ulbzuafadfxdymrtdzgy` (eu-west-1) |
| Vercel project | `hustle-corner` (`prj_4WCOTeuEQr0OYzLR0cyQEvHjqajJ`) |
| Live URL | https://hustle-corner.vercel.app |
| Repo | GitHub `th4ndO/Hustle-Corner-` (`main`), which deploys. Not in the monorepo (stale `Hustle-Corner/` copy deleted 2026-09-26); local path [CONFIRM] |
| Risk | **GREEN** |
| Status | MVP live; how-it-works guide deployed 2026-09-26 (PR #1); Vercel Root Directory fixed 2026-09-26 |

Special rules:
- Stores student sellers' contact details (WhatsApp numbers), so it's still personal data: keep RLS on and don't print rows.

## NameTrace

| Field | Value |
|---|---|
| Supabase ref | none (100% client-side, no backend) |
| Vercel project | `nametrace` (`prj_jRjNuKxhlWH6yRqMNNgJ6CnxyYO1`), linked to this repo, root directory `NameTrace`, production branch `main` (merging to `main` deploys production) |
| Live URL | https://nametrace-green.vercel.app (public; verified 2026-09-26: security headers served, no off-origin requests) |
| Repo | monorepo folder `NameTrace/`; local path [CONFIRM] |
| Risk | **AMBER** (owner decision 2026-09-26: public site that people load POPIA data into; no backend, no stored data) |
| Status | Live since 2026-09-26 (phases 1–7 via PRs #10 and #13). Guided tour in PR #16, awaiting the release gate |

Special rules:
- Users load personal data into it (POPIA): the owner's real use is church roster exports filtered by the "Leader at 1728" column.
- The monorepo is PUBLIC: never commit real exports; fixtures stay synthetic.
- The git-ignored `NameTrace/src/testing/real.local.test.ts` runs on real data and must print aggregates only.
- CSP blocks off-origin requests (asserted by an e2e test); keep it that way.
- AMBER: every production change goes through a branch, a PR with a Vercel preview deploy, gatekeeper-reviewer, and the owner's approval. Changes to `index.html`/`vercel.json` (CSP, headers) or any new network call need an explicit note in the PR.

## Groundwork

| Field | Value |
|---|---|
| Supabase ref | `bvapxwiryuzzbxesbtqo` (Supabase name: "groundwork") |
| Vercel project | `project` (`prj_k2uCOzF5Fny10tCGThm5iWljXqKk`). Re-linked 2026-09-26 from `th4ndO/project-` to this monorepo: root directory `Project/`, production branch `main`, so **a merge to main deploys** |
| Live URL | https://project-tau-self-69.vercel.app |
| Repo | monorepo folder `Project/` (originally imported from `th4ndO/project-`, which no longer drives deploys); local path [CONFIRM] |
| Risk | **GREEN** (owner, 2026-09-26: "personal project"). Personal MVP, no money; holds users' own goal data under RLS |
| Status | Live personal goal/milestone tracker (Next.js 16 + Supabase). No sign-in: each browser gets an anonymous Supabase account via `/start` |

History: the folder was a "Student Budget Planner", then cleared (commit `c408e26`) to start Groundwork. It was never a recipe costing planner; the old registry name "Recipe Costing Planner (academic)" was stale.

Special rules:
- `Project/.env.production` is committed; it holds only public keys (URL, anon key, VAPID public key), as its header comment explains. Anything else appearing there is a finding.
- Anonymous sign-ins are enabled on purpose, so advisor `auth_allow_anonymous_sign_ins` WARNs are expected. The related abuse risks await the owner's risk acceptance (see HANDOFF.md, Groundwork OPEN decisions).
- The Vercel env vars `NEXT_PUBLIC_*` are defined as empty strings in the dashboard; the code falls back to committed public literals (`src/lib/supabase/config.ts`). Use `||`, not `??`, when reading them (an empty string with `??` caused a `/start` outage).

---

## Other Vercel projects (not listed above)

| Vercel project | URL | Notes |
|---|---|---|
| `nos236-creat8ves-inc` | https://nos236-creat8ves-inc.vercel.app | Monorepo folder `Creat8ve-Inc/`. Client landing page [CONFIRM whether on a Care Plan] |
| `house-sookoo-data-tracker` | https://house-sookoo-data-tracker.vercel.app | Monorepo folder `house-sookoo-data-tracker/`. Church roster data, client-side only [CONFIRM risk level] |
| `profound-productions-projects` (`prj_sVtMwTytbZGyaBNKVFkILzkucCHa`) | https://profound-productions-projects.vercel.app (returns 404) | Checked 2026-09-26: linked to this monorepo, Root Directory = repo root, no framework or build settings. Merges to `main` have produced READY production deploys (latest from `800ddcc`; #17 and #18 did not trigger one), but the site serves nothing (404 at `/`). It does **not** serve Groundwork (`project`) or NameTrace (`nametrace`). Looks redundant: [CONFIRM delete or keep] |

## Care Plan clients

The care-plan-runbook skill covers these sites; health-triage skips their npm checks.

| Client | Site | Plan tier | Repo |
|---|---|---|---|
| [CONFIRM] | | | |
