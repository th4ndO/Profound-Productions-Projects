# Routines — ready-to-paste prompts

Create these in **Claude Code → Routines**. Each firing starts a **fresh cloud session**,
so every prompt below is self-contained.

## Before creating any routine (read this once)

1. **Routines run in the cloud, not on your PC.** They can't see `C:\Users\...\.claude`.
   They get the agents, hooks, and rules from the repo-level `.claude/` folder you commit
   in Phase 5 (`templates/claude-kit`). Commit that kit into the repo each routine uses first.
2. **Reports must be committed, or they vanish** when the cloud session ends. innovator
   needs the last 4 health briefs and the latest finance report, so each routine commits its
   report to a **private** reports location:
   - Recommended: a new **private** repo, e.g. `th4ndO/portfolio-ops-reports` [CONFIRM: create it yourself].
   - **Not** `th4ndO/Profound-Productions-Projects`: it's **public**.
3. **Connectors**: give each routine only what it needs. Health: Supabase, Vercel, GitHub. Finance: Supabase. Care Plan: Vercel, GitHub (+ Supabase if the client site uses it). Innovator: GitHub only.
4. **Repos**: Coco Bliss code lives in private `th4ndO/coco-bliss-production-source` [CONFIRM it's the deployed one]. Add it to the health routine's repos if you want npm audit on it.
5. **Times** are South African time: set the routine's timezone to `Africa/Johannesburg`, or use the cron shown.

---

## 1. Weekly health-triage — Sunday 21:00

**Schedule:** `CRON_TZ=Africa/Johannesburg 0 21 * * 0`
**Repos:** Profound-Productions-Projects (for the kit and client folders), portfolio-ops-reports, coco-bliss-production-source (optional)

```
Weekly portfolio health check.

1. Read .claude/PORTFOLIO.md. Act as Portfolio Lead per .claude/CLAUDE.md.
2. Delegate to the health-triage agent for ALL projects in PORTFOLIO.md: Supabase advisors +
   error logs, Vercel failed deployments + runtime errors (last 7 days), and read-only
   `npm audit --package-lock-only` / outdated checks for every non-Care-Plan repo available
   in this session. Never run npm audit fix or install anything.
3. It opens GitHub issues for the top 3 findings only (skip if a matching open issue exists;
   never on ACADEMIC repos; no personal data or secrets in issues).
4. Save the brief as health/health-<YYYY-MM-DD>.md in the portfolio-ops-reports repo, commit,
   and push to its main branch. Nothing else is committed anywhere.
5. Reply with the top 3 in one short paragraph, or the single line
   "Nothing needs attention this week (checked N projects)."
Do not change any code, database, or deployment.
```

## 2. Monthly innovator — first Sunday of the month, 22:00

Cron can't express "first Sunday" directly: day-of-month and day-of-week are OR-ed, so
`0 22 1-7 * 0` would fire on days 1–7 **and** every Sunday. The routine runs **every Sunday**
and exits immediately on other Sundays.

It's set to **22:00, not 21:00**, so it runs after that night's health brief is committed.
At 21:00 both would start together and innovator would miss the newest brief.
Change it back to 21:00 if you prefer.

**Schedule:** `CRON_TZ=Africa/Johannesburg 0 22 * * 0`
**Repos:** portfolio-ops-reports, Profound-Productions-Projects

```
Monthly innovator run.

0. If today's day of the month (Africa/Johannesburg time) is greater than 7, reply
   "Not the first Sunday — skipping." and stop. Do nothing else.
1. Read .claude/PORTFOLIO.md and .claude/CLAUDE.md.
2. Delegate to the innovator agent. Its inputs in this cloud session:
   - .claude/PORTFOLIO.md
   - HANDOFF.md in every repo folder available
   - the latest finance/finance-*.md and the last 4 health/health-*.md in portfolio-ops-reports
   - the gatekeeper log if one was committed (reports repo: logs/gatekeeper.log); if none, say so
3. Max 3 proposals plus one thing to stop doing, evidence only, never on ACADEMIC projects,
   no personal data. If nothing clears the bar, one line.
4. Save as innovator/innovator-<YYYY-MM>.md in portfolio-ops-reports, commit, push.
5. Reply with the proposal titles and estimated hours only.
Do not change any code, database, or deployment.
```

## 3. Monthly finance-reporter — 2nd of the month, 07:45

Runs on the 2nd so the previous month is complete.

**Prerequisite:** you've reviewed and run `finance-readonly-role.sql` on Coco Bliss. Until
then, finance-reporter stops with a message (by design).

**Schedule:** `CRON_TZ=Africa/Johannesburg 45 7 2 * *`
**Repos:** portfolio-ops-reports, Profound-Productions-Projects

```
Monthly finance report for last calendar month.

1. Read .claude/PORTFOLIO.md.
2. Delegate to the finance-reporter agent:
   - Coco Bliss (xvpdqldlqbtafcbycwxp): margin by product, and by channel (market stall vs
     online).
   - Profound Productions (ofbitzqczupdobofuosh): Care Plan monthly recurring revenue.
   Every figure comes from a query shown beside it, run under the finance_readonly role.
   Flag data gaps; never estimate. Aggregates only; no customer details.
3. Save as finance/finance-<YYYY-MM>.md in portfolio-ops-reports, commit, push.
4. Reply with the headline figures and the list of data gaps.
Read-only: do not write to any database.
```

## 4. Monthly care-plan-runbook — one routine per client

Make one copy per Care Plan client and stagger them (3rd, 4th, 5th… of the month) so they
don't pile up. The client list is still [CONFIRM] in PORTFOLIO.md.

**Schedule (client 1):** `CRON_TZ=Africa/Johannesburg 10 9 3 * *` (client 2: `10 9 4 * *`, …)
**Repos:** the client's repo, portfolio-ops-reports

```
Monthly Care Plan maintenance for <CLIENT NAME> (<site URL>, Vercel project <name>).

1. Read .claude/PORTFOLIO.md for this client's tier and special rules.
2. Delegate to the care-plan-runbook agent and follow its monthly runbook for this client,
   within the client's tier.
3. Any change goes through a branch + PR, with gatekeeper-reviewer before merge. Never deploy
   to production or merge without my approval: stop and leave the PR for me.
4. Save the client summary as care-plan/<client-slug>-<YYYY-MM>.md in portfolio-ops-reports,
   commit, push. (A client-facing version, if the runbook produces one, stays as a draft
   for me to send.)
5. Reply with: done / needs my approval (PR link) / blocked (why).
```

---

## Local-only alternative

If you'd rather keep everything on your PC (reports in `~\.claude\reports\`), use Windows
Task Scheduler with `claude -p "<prompt>"` instead of cloud Routines. Your PC must be on at
the scheduled time. Ask me for the Task Scheduler steps if you want this route.
