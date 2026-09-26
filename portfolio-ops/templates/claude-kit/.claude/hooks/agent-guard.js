#!/usr/bin/env node
// Agent guard: a PreToolUse hook attached to individual agents through their frontmatter,
// so an agent's promises ("read-only", "branch only", "read-only role") are enforced by
// Claude Code rather than left to the model. Runs alongside gatekeeper.js, never instead of it.
//
//   node agent-guard.js <mode>[,<mode>...]
//
// Modes:
//   readonly      Bash limited to read-only commands; Write/Edit only inside ~/.claude/reports/
//   issues        (with readonly) also allows `gh issue create` / `gh issue list`
//   branch-only   Supabase execute_sql/apply_migration refused on production refs (branches only)
//   finance       Supabase SQL must switch to the finance_readonly role and must not write
//   no-raw-data   Never read raw CSV/Excel rows into the transcript (Read tool, cat/head/tail...)
//
// Denials are logged to gatekeeper.log with the same no-content format as gatekeeper.js.

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK_DIR = process.env.GATEKEEPER_DIR || __dirname;
// Loaded lazily inside main's try block: if gatekeeper.js is missing, the guard must deny
// (exit 2), not crash (exit 1), because Claude Code lets a call through on a crashed hook.
let isWriteSql;
let loadConfig;

const DATA_FILE_RE = /\.(csv|tsv|xlsx|xls|xlsm|ods)$/i;

function tokenize(segment) {
  const out = [];
  const re = /"((?:\\.|[^"\\])*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(segment))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// Read-only command allowlist. Each simple command in a pipeline/chain must pass.
function readonlyBashViolation(command, modes) {
  if (/`|\$\(/.test(command)) return 'command substitution is not allowed in read-only mode';
  // Output redirection writes files; only discarding output is fine.
  const stripped = command.replace(/\d?>\s*\/dev\/null|\d?>\s*NUL\b|2>&1/gi, '');
  if (/>/.test(stripped)) return 'output redirection (>) writes files';

  for (const seg of command.split(/\|\||&&|[;|\n]/).map((s) => s.trim()).filter(Boolean)) {
    let t = tokenize(seg);
    while (t.length && /^[A-Z_][A-Z0-9_]*=/.test(t[0])) t = t.slice(1); // FOO=bar prefixes
    const [cmd, sub] = [path.basename(t[0] || '').replace(/\.(exe|cmd)$/i, ''), t[1]];
    const args = t.slice(1);
    const has = (...xs) => args.some((a) => xs.includes(a));

    switch (cmd) {
      case 'cd': case 'ls': case 'pwd': case 'cat': case 'head': case 'tail': case 'wc': case 'grep':
      case 'rg': case 'date': case 'echo': case 'sort': case 'uniq': case 'jq': case 'dirname':
      case 'basename': case 'which': case 'test': case 'true': case 'stat': case 'du': case 'tr': case 'cut':
        continue;
      case 'find':
        if (has('-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprintf', '-fls')) return 'find with -delete/-exec';
        continue;
      case 'node': case 'npm': case 'git': case 'gh':
        break;
      default:
        return `\`${cmd}\` is not on the read-only allowlist`;
    }

    if (cmd === 'node') {
      if (args.length === 1 && (sub === '--version' || sub === '-v')) continue;
      return 'running node scripts is not allowed in read-only mode';
    }
    if (cmd === 'npm') {
      if (['audit', 'outdated', 'ls', 'list', 'view', 'info', 'explain', '--version', '-v'].includes(sub) &&
          !has('fix', '--fix', '--force')) continue;
      return `npm ${sub || ''} is not read-only (only audit/outdated/ls/view are allowed; never audit fix or install)`.trim();
    }
    if (cmd === 'git') {
      let gi = 0;
      while (gi < args.length && args[gi].startsWith('-')) gi += args[gi] === '-C' || args[gi] === '-c' ? 2 : 1;
      const g = args[gi];
      const gargs = args.slice(gi + 1);
      const ok = ['status', 'log', 'diff', 'show', 'ls-files', 'rev-parse', 'blame', 'shortlog', 'describe', 'grep', 'ls-tree', 'cat-file', 'merge-base'];
      if (ok.includes(g)) continue;
      if (g === 'branch' && !gargs.some((a) => /^-(d|D|m|M|c|C|f)$|^--(delete|move|copy|force|set-upstream-to|unset-upstream)/.test(a))) continue;
      if (g === 'remote' && (gargs.length === 0 || ['-v', 'show', 'get-url'].includes(gargs[0]))) continue;
      if (g === 'config' && gargs.some((a) => a === '--get' || a === '--list' || a === '-l')) continue;
      return `git ${g || ''} is not read-only`.trim();
    }
    if (cmd === 'gh') {
      const g2 = args[1];
      if (['issue', 'pr', 'run', 'repo', 'release'].includes(sub) && ['list', 'view', 'status'].includes(g2)) continue;
      if (sub === 'search') continue;
      if (sub === 'api') {
        const method = args.find((a, i) => args[i - 1] === '-X' || args[i - 1] === '--method') || (args.find((a) => /^--method=/.test(a)) || '').split('=')[1];
        const hasFields = args.some((a) => /^(-f|-F|--field|--raw-field|--input)$/.test(a));
        if ((!method || /^get$/i.test(method)) && !hasFields) continue;
        return 'gh api is limited to GET requests in read-only mode';
      }
      if (sub === 'issue' && g2 === 'create' && modes.has('issues')) continue;
      return `gh ${sub || ''} ${g2 || ''} is not allowed in read-only mode`.trim();
    }
  }
  return null;
}

function rawDataViolation(tool, input) {
  if (tool === 'Read' && DATA_FILE_RE.test(input.file_path || '')) {
    return 'reading raw CSV/Excel rows into the conversation is not allowed; inspect it with a script that prints aggregates only';
  }
  if (tool === 'Bash') {
    for (const seg of String(input.command || '').split(/\|\||&&|[;|\n]/)) {
      const t = tokenize(seg.trim());
      const cmd = path.basename(t[0] || '');
      if (['cat', 'head', 'tail', 'less', 'more', 'type', 'Get-Content', 'gc', 'bat', 'column', 'csvlook', 'xsv', 'grep', 'rg', 'awk', 'sed'].includes(cmd) &&
          t.slice(1).some((a) => DATA_FILE_RE.test(a))) {
        return `\`${cmd}\` on a data file would print individual rows; report aggregates only`;
      }
    }
  }
  return null;
}

function reportsDir() {
  return path.join(os.homedir(), '.claude', 'reports');
}

function decide(event, modes, cfg) {
  const tool = event.tool_name || '';
  const input = event.tool_input || {};

  if (modes.has('no-raw-data')) {
    const v = rawDataViolation(tool, input);
    if (v) return ['raw-data', v, null];
  }

  if (modes.has('readonly')) {
    if (tool === 'Bash') {
      const v = readonlyBashViolation(String(input.command || ''), modes);
      if (v) return ['readonly-bash', v, null];
    }
    if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
      const target = path.resolve(input.file_path || input.notebook_path || '');
      const rel = path.relative(reportsDir(), target);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return ['readonly-write', `this agent is read-only; it may only write its report under ~/.claude/reports/`, null];
      }
    }
  }

  const mcp = /^mcp__(.+)__([^_].*)$/.exec(tool);
  if (mcp && mcp[1].toLowerCase().includes('supabase')) {
    const t = mcp[2];
    const ref = input.project_id || null;
    if (modes.has('branch-only') && ['execute_sql', 'apply_migration'].includes(t) && cfg.knownProjectRefs.includes(ref)) {
      return ['branch-only', `${t} on a production project ref. Create or use a Supabase BRANCH and pass the branch's project ref instead.`, ref];
    }
    if (modes.has('finance')) {
      if (t === 'apply_migration') return ['finance-readonly', 'finance-reporter never applies migrations', ref];
      if (t === 'execute_sql') {
        const q = String(input.query || '');
        if (!/^\s*(begin\s*;\s*)?set\s+(local\s+)?role\s+"?finance_readonly"?\s*;/i.test(q)) {
          return ['finance-role', 'every finance query must start with `set local role finance_readonly;` (inside begin; ... rollback;) or `set role finance_readonly;`', ref];
        }
        const body = q.replace(/^\s*(begin\s*;\s*)?set\s+(local\s+)?role\s+"?finance_readonly"?\s*;/i, '');
        if (isWriteSql(body)) return ['finance-readonly', 'finance queries must be read-only', ref];
      }
    }
  }
  return null;
}

function main() {
  const modes = new Set((process.argv[2] || 'readonly').split(',').map((s) => s.trim()));
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    let event = {};
    let result;
    try {
      ({ isWriteSql, loadConfig } = require(path.join(__dirname, 'gatekeeper.js')));
      event = JSON.parse(raw || '{}');
      result = decide(event, modes, loadConfig());
    } catch (err) {
      result = ['agent-guard-error', `agent-guard could not evaluate this call (${err && err.name})`, null];
    }
    if (!result) return process.exit(0);
    const [rule, why, ref] = result;
    try {
      const safe = (s) => (typeof s === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(s) ? s : '-');
      fs.appendFileSync(path.join(HOOK_DIR, 'gatekeeper.log'),
        `${new Date().toISOString()} DENY ${safe(event.tool_name)} agent-guard-${rule} ${safe(ref)} ${safe(event.agent_type)}\n`);
    } catch { /* logging never blocks the guard */ }
    const reason = `[agent-guard:${rule}] ${why}. If it's really needed, hand it to escalation-desk.`;
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
    }));
    process.stderr.write(reason + '\n');
    process.exit(2);
  });
}

if (require.main === module) main();
module.exports = { decide, readonlyBashViolation };
