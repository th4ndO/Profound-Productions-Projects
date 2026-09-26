#!/usr/bin/env node
// Builds portfolio-ops/templates/claude-kit/ (a repo-level .claude/ folder for cloud sessions)
// from the same sources as the local install, so the two can't drift apart.
//
//   node portfolio-ops/install/build-cloud-kit.js
//
// Differences from the local (~/.claude) install:
//   - hook commands use "$CLAUDE_PROJECT_DIR/.claude/hooks/..." instead of $HOME
//   - agents and CLAUDE.md read PORTFOLIO.md from the repo's .claude/ folder
//   - hooks are registered in .claude/settings.json (project settings)

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KIT = path.join(ROOT, 'kit', 'claude');
const OUT = path.join(ROOT, 'templates', 'claude-kit');
const DOT = path.join(OUT, '.claude');

const toCloud = (text) =>
  text
    .split('$HOME/.claude/hooks').join('$CLAUDE_PROJECT_DIR/.claude/hooks')
    .split('`~/.claude/PORTFOLIO.md`').join('`.claude/PORTFOLIO.md` (repo root)')
    .split('~/.claude/PORTFOLIO.md').join('.claude/PORTFOLIO.md')
    .split('~/.claude/hooks/gatekeeper.log').join('.claude/hooks/gatekeeper.log');

function write(rel, content) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  console.log(`wrote ${path.relative(ROOT, dest)}`);
}

fs.rmSync(DOT, { recursive: true, force: true });

// Hooks: copied byte-for-byte (they locate their config and log via __dirname).
for (const f of ['gatekeeper.js', 'gatekeeper.config.json', 'agent-guard.js']) {
  write(`.claude/hooks/${f}`, fs.readFileSync(path.join(KIT, 'hooks', f)));
}

// Agents: path-adjusted copies.
for (const f of fs.readdirSync(path.join(KIT, 'agents')).filter((x) => x.endsWith('.md'))) {
  write(`.claude/agents/${f}`, toCloud(fs.readFileSync(path.join(KIT, 'agents', f), 'utf8')));
}

// Registry and Portfolio Lead instructions.
write('.claude/PORTFOLIO.md', fs.readFileSync(path.join(KIT, 'PORTFOLIO.md'), 'utf8'));
write('.claude/CLAUDE.md',
  '# Project instructions (portfolio kit)\n\n' +
  'In cloud sessions the registry is `.claude/PORTFOLIO.md` in this repo; locally it is `~/.claude/PORTFOLIO.md`. Use whichever exists (local wins).\n\n' +
  toCloud(fs.readFileSync(path.join(KIT, 'portfolio-lead.md'), 'utf8')));

// Project settings: the gatekeeper on every matcher, exactly as locally.
const hook = { type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/gatekeeper.js"', timeout: 15 };
write('.claude/settings.json', JSON.stringify({
  hooks: {
    PreToolUse: ['Bash', 'Write|Edit|MultiEdit|NotebookEdit', 'mcp__.*'].map((matcher) => ({ matcher, hooks: [hook] })),
  },
}, null, 2) + '\n');

// Never commit the decision log.
write('.claude/.gitignore', 'hooks/gatekeeper.log\nreports/\n');
