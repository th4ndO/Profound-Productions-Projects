# claude-kit: portfolio rules for cloud sessions

A repo-level `.claude/` folder. Commit it into a repo, and every Claude Code session in that
repo (including cloud sessions in your **"Profound Productions Projects"** environment and
cloud Routines) gets the same Portfolio Lead rules, gatekeeper hook, and agents as your PC.

**Generated file: don't edit here.** Edit `portfolio-ops/kit/claude/`, then run
`node portfolio-ops/install/build-cloud-kit.js` and re-copy the result into your repos.

## What's inside

| Path | What it does |
|---|---|
| `.claude/CLAUDE.md` | Portfolio Lead instructions (reads `.claude/PORTFOLIO.md`) |
| `.claude/PORTFOLIO.md` | Project registry: refs, risk levels, rules |
| `.claude/settings.json` | Registers `gatekeeper.js` on Bash, Write/Edit, and all MCP tools |
| `.claude/hooks/gatekeeper.js` + `gatekeeper.config.json` | The gatekeeper (RED refs are in the config) |
| `.claude/hooks/agent-guard.js` | Per-agent enforcement (read-only / branch-only / finance / no-raw-data) |
| `.claude/agents/*.md` | The 8 portfolio agents (the 7 from the plan plus innovator) |
| `.claude/.gitignore` | Keeps `gatekeeper.log` and reports out of git |

The 10 pp-agent-kit agents are **not** included. Add them to a repo's `.claude/agents/`
yourself if cloud sessions should have them.

## ⚠️ Private repos only

`PORTFOLIO.md` maps your Supabase projects, which database holds POPIA data, and what the
gatekeeper blocks. Commit this kit **only to private repositories**. Check first:
GitHub → repo → the badge next to the name must say **Private**.

## How to add it to a repo

1. Copy the `.claude` folder from this directory to the **root** of the repo (next to `package.json` or the repo's README).
   - If the repo already has `.claude/settings.json`: merge the `hooks.PreToolUse` entries into it by hand; don't replace the file.
   - If it already has `.claude/CLAUDE.md`: append this kit's CLAUDE.md content to it.
   - If it already has an agent with the same name: keep theirs or ours, not both.
2. Commit and push:
   ```
   git checkout -b add-claude-kit
   git add .claude
   git commit -m "Add portfolio Claude kit (gatekeeper, agents, Portfolio Lead rules)"
   git push -u origin add-claude-kit
   ```
   Then merge the PR. Cloud sessions use the default branch unless told otherwise.
3. In the monorepo (`Profound-Productions-Projects`), the kit at the root covers every folder,
   including the ACADEMIC `Project/`. That's intended: the ACADEMIC rule applies there.
4. **First cloud session after adding it: run these checks.** They're the only way to confirm the cloud behaviour listed below.
   - Ask: *"Run `supabase db reset` in a scratch folder."* → expect a gatekeeper block (`[gatekeeper:supabase-db-reset]`).
   - Ask: *"Use the health-triage agent to run `npm install left-pad`."* → expect `[agent-guard:readonly-bash]`. If it runs instead, see item 4 below.
   - Ask: *"List my Supabase projects."* → should work (reads aren't gated).

## Hook behaviour that may differ in the cloud

1. **Shell:** cloud containers are Linux, so hooks run via `sh`, not Git Bash or PowerShell. Tested: both hooks deny correctly through `sh -c` with `$CLAUDE_PROJECT_DIR` set.
2. **Only project hooks exist.** Your PC's `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, and `~/.claude/agents` are not in the cloud; this kit replaces them there. On your PC, when you work in a repo that contains this kit, both run: the gatekeeper fires twice (harmless, same decision), and **this repo's agents take precedence** over same-named `~/.claude/agents`. Rebuild and re-copy after changing agents, or the two will drift.
3. **The log doesn't survive.** `.claude/hooks/gatekeeper.log` lives only as long as the cloud session. For innovator to see cloud decisions, a routine must copy it into your private reports repo (see `routines.md`).
4. **Agent-level guards may be skipped.** Claude Code only runs hooks declared in a *project* agent's frontmatter when the workspace is trusted. If the step 4 test shows health-triage can run `npm install`, the agents' read-only / branch-only guards aren't active in the cloud. The gatekeeper (from `settings.json`) still is. Then treat cloud agents as instruction-bound only, and keep RED work on your PC.
5. **ASK prompts in unattended sessions.** In a Routine nobody is watching, an ASK decision can't be approved. The action waits or is refused depending on the permission mode (not documented; test it). DENY rules always block (exit code 2).
6. **Tool names:** cloud MCP servers are named `Supabase` and `Vercel` (verified). If a routine adds a connector under another name, the gatekeeper still matches (it looks for "supabase"/"vercel" in the server name), but agents' `tools:` lines use exact names. Check `/agents` if an agent says it lacks a tool.
7. **No `gh` CLI in cloud sessions.** health-triage uses the GitHub MCP tools (`mcp__github__...`) there, and `gh` on your PC; both are in its tools list.
8. **Force-push rule:** cloud sessions push to `claude/...` branches, so the main/master force-push block rarely fires there, but it's still active.
9. **`.env.local` exemption:** cloud repos usually have no `.env.local`, so any secret write is blocked. Use the environment's secrets settings instead.
