# Portfolio Registry

Source of truth for which project is which, how risky it is, and what agents may do.
The Portfolio Lead (main session) reads this before any work. Context Keeper updates
the **Status** line when a project's state changes.

Anything marked **[CONFIRM]** could not be verified with read-only tools and must be
filled in by the owner.

- Vercel team: `profoundproductionss-8104's projects` (`team_7iL1yrOnIknhqSYPcwGQNhg3`)
- Supabase org: `cnjjasuizkwoestacrxo`
- Cloud monorepo: `th4ndO/Profound-Productions-Projects` (folders listed per project below)
- Last verified: 2026-09-25 (Vercel `list_projects` / `list_project_domains`, Supabase `list_projects`)

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
| Status | [CONFIRM] |

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

## CampusHustle

| Field | Value |
|---|---|
| Supabase ref | `ulbzuafadfxdymrtdzgy` (eu-west-1) |
| Vercel project | `hustle-corner` (`prj_4WCOTeuEQr0OYzLR0cyQEvHjqajJ`) |
| Live URL | https://hustle-corner.vercel.app |
| Repo | GitHub `th4ndO/Hustle-Corner-` (`main`), which deploys. Not in the monorepo; local path [CONFIRM] |
| Risk | **GREEN** |
| Status | MVP (UP Hatfield side-hustle directory) |

Special rules:
- Stores student sellers' contact details (WhatsApp numbers), so it's still personal data: keep RLS on and don't print rows.

## Recipe Costing Planner (academic)

| Field | Value |
|---|---|
| Supabase ref | `bvapxwiryuzzbxesbtqo`. Note: Supabase names this project **"groundwork"**, not "recipe-costing-planner-db" [CONFIRM same project] |
| Vercel project | probably `project` (`prj_k2uCOzF5Fny10tCGThm5iWljXqKk`): the `Project/` folder references this ref [CONFIRM] |
| Live URL | https://project-tau-self-69.vercel.app [CONFIRM] |
| Repo | monorepo folder `Project/` (from `th4ndO/project-`); local path [CONFIRM] |
| Risk | **ACADEMIC** |
| Status | Graded university project; module AI policy not confirmed |

Special rules:
- **Review and test only.** No agent writes code, migrations, or config here until the owner confirms the module's AI policy.
- innovator must never propose work on this project.
- `Project/.env.production` is committed; it holds only public keys (URL, anon key, VAPID public key), as its header comment explains. Anything else appearing there is a finding.

---

## Other Vercel projects (not in the 5 above)

| Vercel project | URL | Notes |
|---|---|---|
| `nos236-creat8ves-inc` | https://nos236-creat8ves-inc.vercel.app | Monorepo folder `Creat8ve-Inc/`. Client landing page [CONFIRM whether on a Care Plan] |
| `house-sookoo-data-tracker` | https://house-sookoo-data-tracker.vercel.app | Monorepo folder `house-sookoo-data-tracker/`. Church roster data, client-side only [CONFIRM risk level] |
| `profound-productions-projects` | [CONFIRM] | Created 2026-09-25, probably linked to this monorepo. [CONFIRM it should exist: a monorepo of static and Expo apps may not build] |

## Care Plan clients

The care-plan-runbook skill covers these sites; health-triage skips their npm checks.

| Client | Site | Plan tier | Repo |
|---|---|---|---|
| [CONFIRM] | | | |
