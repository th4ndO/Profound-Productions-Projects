# Agent and skill roster

Verified on the owner's PC on 2026-09-26 (`install.js agents-report` plus a search of `~/.claude`).
pp-agent-kit turned out to be **5 agents + 4 skills**, not 10 agents; code-reviewer comes from official plugins.

## Agents (the Portfolio Lead hands tasks to these)

| Agent | Source | One line | Edits code? |
|---|---|---|---|
| architect | pp-agent-kit | Plans the build, scoped to the client's tier; its plan is what gatekeeper-reviewer checks against | No |
| qa-tester | pp-agent-kit | Pre-demo / pre-deploy QA of the live preview (forms, mobile, links, console) | No |
| security-auditor | pp-agent-kit | Security review before first prod deploy and after auth/payments/uploads/admin changes | No |
| launch-auditor | pp-agent-kit | SEO, performance, accessibility audit; client-shareable summary | No |
| site-medic | pp-agent-kit | Live-site emergency triage; proposes smallest fix + rollback, doesn't apply it | No |
| gatekeeper-reviewer | portfolio-ops | Release gate: PASS/BLOCK on the diff vs the plan | No |
| schema-keeper | portfolio-ops | All DB/RLS changes, branch-first, attack-tested | Yes (branches only, hook-enforced) |
| context-keeper | portfolio-ops | Internal HANDOFF.md + PORTFOLIO.md status | Docs only |
| health-triage | portfolio-ops | Weekly read-only portfolio health + npm audit; top-3 issues | No (hook-enforced) |
| data-steward | portfolio-ops | CSV/Excel into a branch; aggregates only | Branch data only |
| finance-reporter | portfolio-ops | Query-backed margin and MRR via a read-only role | No (hook-enforced) |
| escalation-desk | portfolio-ops | 30-second yes/no decision cards; a NO is final | No |
| innovator | portfolio-ops | Monthly max-3 evidence-backed proposals | No (hook-enforced) |
| code-reviewer | official plugins `feature-dev` / `pr-review-toolkit` (if enabled) | Code quality review during development | Suggests |

## Skills (the main session loads and follows these)

| Skill | Source | Used for | Available in cloud? |
|---|---|---|---|
| site-scaffold | pp-agent-kit | New client site setup | No (PC only, `~/.claude/skills`) |
| client-copywriter | pp-agent-kit | Client-facing copy | No |
| handover-pack | pp-agent-kit | Client handover documents | No |
| care-plan-runbook | pp-agent-kit | Monthly Care Plan maintenance | No, so the Care Plan routine needs the skill committed to the repo, or runs on the PC |

## Release flow for any production change

architect (plan) → build → qa-tester → security-auditor (if auth, payments, uploads or admin changed) →
gatekeeper-reviewer (PASS) → escalation-desk card if anything is blocked → **owner approves** → deploy/merge.
Database changes: schema-keeper on a branch → gatekeeper-reviewer → owner approves `merge_branch`.

## Overlaps (all resolved by the boundaries above)

| Pair | Overlap | Boundary |
|---|---|---|
| qa-tester ↔ gatekeeper-reviewer | both run before production | qa-tester checks behaviour first; gatekeeper-reviewer checks the diff last |
| security-auditor ↔ gatekeeper-reviewer ↔ schema-keeper | secrets, RLS | auditor = deep review; gatekeeper = per-release gate; schema-keeper = writes RLS + attack tests |
| code-reviewer ↔ gatekeeper-reviewer | both read diffs | code-reviewer = quality during development; never stands in for the gate |
| site-medic ↔ health-triage | broken sites | health-triage finds and ranks weekly; site-medic handles live emergencies |
| care-plan-runbook ↔ health-triage | client sites | the skill owns Care Plan sites; health-triage skips their npm checks, still reports their errors |
| handover-pack ↔ context-keeper | "handoff" docs | handover-pack = for the client; context-keeper = for the owner |
| architect ↔ innovator | what to build | innovator proposes *whether*; architect plans *how* once the owner says yes |

## Verified: no conflicts in the pp-agent-kit agents

- site-medic "does not apply fixes itself", so it doesn't conflict with the no-production rule.
- architect "never writes code".
- qa-tester and security-auditor are report-only.

## Remaining improvements (owner decision; show the diff first)

1. The 5 pp-agent-kit agents have **no `tools:` line**, so they inherit every tool, including Supabase write tools.
   They only report, so a minimal list (Read, Grep, Glob, Bash, plus read-only MCP tools) would be safer. The gatekeeper still
   protects RED databases either way.
2. None of the pp-agent-kit agents or skills mentions the **ACADEMIC** rule; only the Portfolio Lead enforces it.
3. **site-scaffold** (skill) may create Supabase tables. The Portfolio Lead rule routes those to schema-keeper, but the
   skill's own text should say so too.
