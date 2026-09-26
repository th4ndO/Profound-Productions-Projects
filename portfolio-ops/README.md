# portfolio-ops

Portfolio agent system for the 5 Next.js / Supabase / Vercel projects: a registry, a Portfolio
Lead rule set, a gatekeeper hook, 8 agents, ops templates, and a cloud kit.

Nothing here touches production, deployments, or accounts. The installer only writes to your
own `~/.claude` and `Documents` folders, never deletes, and never overwrites a file you've
edited (the new version is saved beside it as `*.kit-new`).

## Install on your PC (Windows PowerShell, from the repo root)

```powershell
node portfolio-ops\install\install.js backup      # Phase 0: ~/.claude -> ~/.claude-backup-<date>; must print BACKUP VERIFIED
node portfolio-ops\install\install.js registry    # Phase 1: PORTFOLIO.md + Portfolio Lead section in ~/.claude/CLAUDE.md
node portfolio-ops\install\install.js hooks       # Phase 2: gatekeeper.js + config; merges hooks into ~/.claude/settings.json
node portfolio-ops\install\install.js agents      # Phase 3: 8 agents + agent-guard.js (add --mcp-rename ... if /mcp shows other server names)
node portfolio-ops\install\install.js ops         # Phase 4: ops files -> Documents\ProfoundProductions\portfolio-ops
node portfolio-ops\install\install.js templates   # Phase 5: cloud kit -> Documents\ProfoundProductions\templates\claude-kit
node portfolio-ops\install\install.js agents-report   # list all agents (check for overlaps)
```

- Every step after `backup` refuses to run without today's backup.
- If Documents lives in OneDrive, add `--docs "$env:USERPROFILE\OneDrive\Documents"` to `ops` and `templates`.
- MCP server names: run `/mcp` in Claude Code. If they're not `Supabase` / `Vercel`, e.g. `claude_ai_Supabase`, add
  `--mcp-rename Supabase=claude_ai_Supabase,Vercel=claude_ai_Vercel` to the `agents` step, and use the same flag every time.
- Restart Claude Code afterwards, then check `/hooks` and `/agents`.

## Updating after the kit changes (Command Prompt)

```
cd /d %USERPROFILE%\Documents\Profound-Productions-Projects && git pull && node portfolio-ops\install\install.js backup && node portfolio-ops\install\install.js registry && node portfolio-ops\install\install.js hooks --update && node portfolio-ops\install\install.js agents --update --mcp-rename Supabase=claude_ai_Supabase,Vercel=claude_ai_Vercel
```

`--update` replaces only kit-owned files (hooks, the 8 agents) and keeps the old copy as `.bak`. `registry`
refreshes the Portfolio Lead block in CLAUDE.md; PORTFOLIO.md is never overwritten (a `PORTFOLIO.md.kit-new`
appears if the kit's copy changed, so you can compare and merge your edits by hand).

## Verify (safe, fake data only)

```powershell
node portfolio-ops\tests\gatekeeper.test.js "$env:USERPROFILE\.claude\hooks\gatekeeper.js"
node portfolio-ops\tests\agent-guard.test.js "$env:USERPROFILE\.claude\hooks\agent-guard.js"
```

## Layout

| Path | What |
|---|---|
| `kit/claude/` | Source of everything installed into `~/.claude` |
| `ops/` | Phase 4 files (SQL not run, checklists, template code, routine prompts) |
| `templates/claude-kit/` | Generated repo-level `.claude/` for cloud sessions (`install/build-cloud-kit.js`) |
| `tests/` | Gatekeeper and agent-guard test suites |
| `AGENTS-OVERVIEW.md` | All 18 agents, overlaps, and conflicts to check |

After changing anything in `kit/`, run `node portfolio-ops/install/build-cloud-kit.js` and both test suites.
