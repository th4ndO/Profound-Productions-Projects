# Agent roster (18) and overlaps

The 10 pp-agent-kit agents aren't in this repo, so their lines below come from their **names** only.
Run `node install/install.js agents-report` on your PC to print their real descriptions and tool lists,
then check the "Verify" items against them.

| # | Agent | Source | One line |
|---|---|---|---|
| 1 | architect | pp-agent-kit | Plans a build; its plan is what gatekeeper-reviewer checks scope against. |
| 2 | site-scaffold | pp-agent-kit | Sets up a new client site. |
| 3 | client-copywriter | pp-agent-kit | Writes client-facing site copy. |
| 4 | code-reviewer | pp-agent-kit | Reviews code quality during development. |
| 5 | security-auditor | pp-agent-kit | Deep security audit on demand. |
| 6 | launch-auditor | pp-agent-kit | Pre-launch checklist for a site. |
| 7 | qa-tester | pp-agent-kit | Functional/app-level testing. |
| 8 | handover-pack | pp-agent-kit | Client-facing handover documents at project end. |
| 9 | care-plan-runbook | pp-agent-kit | Monthly maintenance for Care Plan client sites. |
| 10 | site-medic | pp-agent-kit | Diagnoses and fixes a broken site. |
| 11 | gatekeeper-reviewer | new | Release gate: PASS/BLOCK on a diff; never fixes. |
| 12 | schema-keeper | new | All DB/RLS changes, branch-first, attack-tested. |
| 13 | context-keeper | new | Internal HANDOFF.md + PORTFOLIO.md status. |
| 14 | health-triage | new | Weekly read-only portfolio health + npm audit; top-3 issues. |
| 15 | data-steward | new | CSV/Excel imports into a branch; aggregates only. |
| 16 | finance-reporter | new | Query-backed margin and MRR via a read-only role. |
| 17 | escalation-desk | new | 30-second yes/no decision cards; a NO is final. |
| 18 | innovator | new | Monthly max-3 evidence-backed proposals; read-only. |

## Overlaps (resolved by these boundaries)

| Pair | Overlap | Boundary |
|---|---|---|
| code-reviewer ↔ gatekeeper-reviewer | both review diffs | code-reviewer = quality during development, suggests fixes; gatekeeper-reviewer = final gate, fixed checklist, PASS/BLOCK only |
| security-auditor ↔ gatekeeper-reviewer ↔ schema-keeper | secrets, RLS | security-auditor = deep periodic audit; gatekeeper-reviewer = per-diff gate; schema-keeper = writes RLS + attack tests |
| qa-tester ↔ schema-keeper | tests | schema-keeper owns RLS attack tests; qa-tester owns app/UI/flow tests (incl. payment flows gatekeeper-reviewer requires) |
| site-medic ↔ health-triage | broken sites | health-triage finds and ranks (read-only); site-medic fixes |
| care-plan-runbook ↔ health-triage | client-site health | care-plan-runbook owns Care Plan sites (health-triage skips their npm checks, still reports their Vercel/Supabase errors) |
| handover-pack ↔ context-keeper | "handoff" docs | handover-pack = for the client; context-keeper = for you (internal HANDOFF.md) |
| architect ↔ innovator | what to build | innovator proposes *whether*; architect plans *how* once you say yes |
| launch-auditor ↔ gatekeeper-reviewer | pre-release | launch-auditor = site-level launch checklist once; gatekeeper-reviewer = every production change |

## Possible conflicts — verify in the pp-agent-kit files (I can't see them)

1. **site-medic** — if it deploys fixes straight to production or runs SQL on a live DB, it conflicts with the Portfolio Lead rule and schema-keeper. The gatekeeper hook will ASK/DENY anyway; the instructions should route DB fixes to schema-keeper and deploys through gatekeeper-reviewer.
2. **site-scaffold** — if it creates Supabase projects or tables directly, it conflicts with schema-keeper (branch-first, RLS on every table). Creating projects now triggers a billing ASK.
3. **security-auditor / code-reviewer** — if either *fixes* code itself, that's fine during development, but it must not stand in for gatekeeper-reviewer's PASS on a release.
4. **Any agent with no `tools:` line** inherits everything, including production-capable MCP tools. The gatekeeper hook still applies, but a minimal list is safer.
5. **ACADEMIC** — any pp-agent-kit agent that writes code will happily do so on the academic project; only the Portfolio Lead rule stops it. Consider adding the ACADEMIC line to those agents (I'd show you the diff first).
