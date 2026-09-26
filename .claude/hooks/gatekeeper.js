#!/usr/bin/env node
// Gatekeeper: Claude Code PreToolUse hook. Cross-platform (Node only, no bash).
//
// Reads the pending tool call as JSON on stdin and answers with a permission decision:
//   DENY -> JSON {permissionDecision:"deny"} on stdout, reason on stderr, exit 2
//           (exit 2 blocks even when an allow rule or bypass mode would let the call through)
//   ASK  -> JSON {permissionDecision:"ask"} on stdout, exit 0 (forces a prompt)
//   pass -> no output, exit 0 (normal permission flow continues)
//
// Every DENY/ASK is appended to gatekeeper.log (next to this file) as one line:
//   <ISO timestamp> <DENY|ASK> <tool name> <rule name> <project ref or ->
// The command, SQL, or file content is NEVER logged: it may contain secrets.
//
// Settings live in gatekeeper.config.json next to this file.
// Hook format: https://code.claude.com/docs/en/hooks (PreToolUse).

'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULTS = {
  redRefs: ['xvpdqldlqbtafcbycwxp', 'whvmbftpbrqkygnltvvz'],
  knownProjectRefs: [
    'xvpdqldlqbtafcbycwxp',
    'whvmbftpbrqkygnltvvz',
    'ofbitzqczupdobofuosh',
    'ulbzuafadfxdymrtdzgy',
    'bvapxwiryuzzbxesbtqo',
  ],
  protectedBranches: ['main', 'master'],
  log: true,
};

const HOOK_DIR = process.env.GATEKEEPER_DIR || __dirname;
const LOG_FILE = path.join(HOOK_DIR, 'gatekeeper.log');

// ---------------------------------------------------------------- config + log

function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(HOOK_DIR, 'gatekeeper.config.json'), 'utf8'));
    return { ...DEFAULTS, ...raw, configError: false };
  } catch {
    return { ...DEFAULTS, configError: true };
  }
}

// Only ids that look like identifiers reach the log, so nothing else can leak through it.
function safeRef(ref) {
  return typeof ref === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(ref) ? ref : '-';
}

function writeLog(cfg, decision, tool, rule, ref) {
  if (cfg.log === false) return;
  try {
    const line = [new Date().toISOString(), decision, safeRef(tool), rule, safeRef(ref)].join(' ');
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {
    // Logging must never break the gate itself.
  }
}

// ---------------------------------------------------------------- helpers

const deny = (rule, reason, ref) => ({ decision: 'deny', rule, reason, ref });
const ask = (rule, reason, ref) => ({ decision: 'ask', rule, reason, ref });

// Splits "mcp__<server>__<tool>" into parts. Server names vary by install
// (Supabase, supabase, claude_ai_Supabase, plugin_supabase_supabase), so callers
// match the server by substring rather than exact name.
function parseMcpName(name) {
  if (!name.startsWith('mcp__')) return null;
  const rest = name.slice(5);
  const i = rest.lastIndexOf('__');
  if (i === -1) return null;
  return { server: rest.slice(0, i).toLowerCase(), tool: rest.slice(i + 2) };
}

// Removes comments, quoted strings and dollar-quoted bodies' quoting noise so keywords
// inside string literals don't count. $$ bodies are kept: code inside a function is real SQL.
function normaliseSql(sql) {
  return String(sql || '')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .toUpperCase();
}

function isDestructiveSql(sql) {
  const s = normaliseSql(sql)
    // Referential actions and policy targets are not destructive statements.
    .replace(/\bON\s+(DELETE|UPDATE)\b/g, ' ')
    .replace(/\bFOR\s+(DELETE|UPDATE|INSERT|SELECT|ALL)\b/g, ' ');
  return /\b(DROP|TRUNCATE|DELETE|ALTER)\b/.test(s);
}

function isWriteSql(sql) {
  const s = normaliseSql(sql);
  return (
    /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COMMENT\s+ON|COPY|VACUUM|REINDEX|CLUSTER|REFRESH|CALL|LOCK|IMPORT|SECURITY\s+LABEL|REASSIGN|SELECT\s[\s\S]*\bINTO\b)\b/.test(s) ||
    /(^|;)\s*DO\b/.test(s)
  );
}

// Minimal shell-ish tokenizer: splits on whitespace, respects single/double quotes.
function tokenize(segment) {
  const out = [];
  const re = /"((?:\\.|[^"\\])*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(segment))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// Splits a command line into simple commands on ; && || | and newlines.
function segments(command) {
  return String(command || '').split(/\|\||&&|[;|\n]/).map((s) => s.trim()).filter(Boolean);
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], {
      cwd, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Bash rules

function checkGitForcePush(tokens, cwd, cfg) {
  const gi = tokens.findIndex((t) => t === 'git' || /[\\/]git(\.exe)?$/i.test(t));
  if (gi === -1) return null;
  let i = gi + 1;
  let dir = cwd;
  // Skip git global options, honouring -C <dir>.
  while (i < tokens.length && tokens[i].startsWith('-')) {
    if (tokens[i] === '-C' || tokens[i] === '-c') {
      if (tokens[i] === '-C') dir = path.resolve(cwd || '.', tokens[i + 1] || '.');
      i += 2;
    } else i++;
  }
  if (tokens[i] !== 'push') return null;
  const args = tokens.slice(i + 1);

  const flags = args.filter((a) => a.startsWith('-'));
  const positional = args.filter((a) => !a.startsWith('-'));
  const plusRefspec = positional.some((p) => p.startsWith('+'));
  const force =
    plusRefspec ||
    flags.some((f) => f === '-f' || f === '--force' || f.startsWith('--force-with-lease') ||
      (/^-[a-zA-Z]+$/.test(f) && f.includes('f')));
  if (!force) return null;

  const protectedSet = new Set(cfg.protectedBranches);
  const refspecs = positional.slice(1); // first positional is the remote
  const hitsProtected = (spec) => {
    const dst = spec.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '');
    return protectedSet.has(dst);
  };

  if (flags.includes('--all') || flags.includes('--mirror')) {
    return deny('git-force-push-protected', 'Force push with --all/--mirror would overwrite main/master. Blocked.');
  }
  const blocked = 'Force push to main/master rewrites shared history and is blocked. Push to a feature branch and open a PR instead.';
  if (refspecs.length) return refspecs.some(hitsProtected) ? deny('git-force-push-protected', blocked) : null;
  const branch = currentBranch(dir);
  if (branch === null) {
    return ask('git-force-push-unknown-branch', 'Force push with no branch named, and the current branch could not be determined. Check the target before approving.');
  }
  return protectedSet.has(branch) ? deny('git-force-push-protected', blocked) : null;
}

function checkBash(input, cwd, cfg) {
  const command = input.command || '';
  let result = null;
  for (const seg of segments(command)) {
    const tokens = tokenize(seg);
    const r = checkGitForcePush(tokens, cwd, cfg);
    if (r) return r; // deny wins immediately

    if (/\bsupabase\b[\s\S]*\bdb\s+reset\b/i.test(seg)) {
      return deny('supabase-db-reset',
        '`supabase db reset` wipes the database (and with --linked, the remote one). Blocked. Use a Supabase branch instead.');
    }

    if (tokens.some((t) => /(^|[\\/])vercel(\.cmd|\.exe)?$/i.test(t))) {
      if (tokens.some((t) => t === '--prod' || t === '--production' || t === '--target=production') ||
          tokens.some((t, k) => t === '--target' && tokens[k + 1] === 'production') ||
          tokens.includes('promote') || tokens.includes('rollback')) {
        result = result || ask('vercel-cli-production', 'This Vercel CLI command changes the PRODUCTION deployment. Approve only if gatekeeper-reviewer passed.');
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------- Write / Edit rules

function jwtRole(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).role || null;
  } catch {
    return null;
  }
}

// Returns the name of the first secret pattern found, or null. Never returns the secret.
function findSecret(text) {
  if (!text) return null;
  if (/sk_live_[A-Za-z0-9]{8,}/.test(text)) return 'sk_live key';
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(text)) return 'Supabase secret key (sb_secret_)';
  const sr = text.match(/SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*["']?([^\s"'#]*)/);
  if (sr && sr[1].length >= 20) return 'SUPABASE_SERVICE_ROLE_KEY assignment';
  if (/service_role[A-Za-z_]*["']?\s*[=:]\s*["'][A-Za-z0-9._-]{20,}/i.test(text)) return 'service_role key assignment';
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    // Supabase anon/publishable JWTs are public by design; everything else is treated as secret.
    if (jwtRole(m[0]) !== 'anon') return 'JWT (' + (jwtRole(m[0]) || 'unknown role') + ')';
  }
  return null;
}

function isIgnoredEnvFile(filePath) {
  const base = path.basename(filePath || '');
  if (!/^\.env(\..+)?$/.test(base) || /\.(example|sample|template)$/i.test(base)) return false;
  if (base === '.env.local' || /^\.env\..+\.local$/.test(base)) return true;
  try {
    execFileSync('git', ['check-ignore', '-q', base], {
      cwd: path.dirname(path.resolve(filePath)), timeout: 3000, stdio: 'ignore',
    });
    return true; // exit 0 = ignored
  } catch {
    return false;
  }
}

function checkWrite(toolName, input) {
  const texts = [];
  if (typeof input.content === 'string') texts.push(input.content);
  if (typeof input.new_string === 'string') texts.push(input.new_string);
  if (typeof input.new_source === 'string') texts.push(input.new_source);
  if (Array.isArray(input.edits)) for (const e of input.edits) if (e && typeof e.new_string === 'string') texts.push(e.new_string);
  const filePath = input.file_path || input.notebook_path || '';
  for (const t of texts) {
    const kind = findSecret(t);
    if (kind) {
      if (isIgnoredEnvFile(filePath)) return null;
      return deny('secret-in-file',
        `This ${toolName} would write a ${kind} into ${path.basename(filePath) || 'a file'}, which is not a gitignored env file. ` +
        'Put secrets in .env.local or the Vercel/Supabase dashboard and reference them via process.env.');
    }
  }
  return null;
}

// ---------------------------------------------------------------- MCP rules

const BILLING_RE = /(^|_)(buy|purchase|checkout|billing|payment|invoice|upgrade|confirm_cost)(_|$)|^buy/i;
const READ_PREFIX_RE = /^(get|list|search|count|read|check)_/i;

function checkSupabase(tool, input, cfg) {
  const red = new Set(cfg.redRefs);
  const known = new Set(cfg.knownProjectRefs);
  const ref = input.project_id || input.branch_id || null;
  const isRed = input.project_id && red.has(input.project_id);

  switch (tool) {
    case 'execute_sql':
    case 'apply_migration':
      if (isRed && isDestructiveSql(input.query)) {
        return deny('red-destructive-sql',
          `DROP/TRUNCATE/DELETE/ALTER on a RED production database is blocked. Apply it to a Supabase branch via schema-keeper, then merge with approval.`, ref);
      }
      if (isRed && (tool === 'apply_migration' || isWriteSql(input.query))) {
        return ask('red-db-write', 'This writes to a RED production database. Approve only with an explicit yes.', ref);
      }
      return null;
    case 'delete_branch':
    case 'reset_branch':
      if (known.has(input.branch_id)) {
        return deny('branch-op-on-project',
          `${tool} was given a PROJECT ref, not a branch id. Blocked: that could destroy a real project.`, ref);
      }
      return null;
    case 'pause_project':
      if (isRed) return deny('pause-red-project', 'Pausing a RED project takes a live service offline. Blocked.', ref);
      return ask('pause-project', 'Pausing takes this project offline. Approve?', ref);
    case 'merge_branch':
      // A branch id doesn't reveal its parent project, so every merge to production asks.
      return ask('merge-branch-to-production', 'Merging a branch applies its migrations to PRODUCTION. Needs gatekeeper-reviewer + your approval.', ref);
    case 'restore_project':
      if (isRed) return ask('red-db-write', 'Restoring a RED project changes production. Approve only with an explicit yes.', ref);
      return null;
    case 'create_project':
      return ask('billing', 'Creating a Supabase project can add monthly cost. Approve?', ref);
    default:
      return null;
  }
}

function checkVercel(tool, input) {
  const ref = input.projectId || (input.requestBody && input.requestBody.project) || null;
  const body = input.requestBody || {};
  switch (tool) {
    case 'create_deployment':
      if (body.target === 'production' || (body.deploymentId && !body.target)) {
        return ask('vercel-production-deploy', 'This creates a PRODUCTION deployment (or a redeploy that may inherit production). Approve?', ref);
      }
      return null;
    case 'request_promote':
      return ask('vercel-promote', 'Promotes a deployment to PRODUCTION. Approve?', ref);
    case 'request_rollback':
      return ask('vercel-rollback', 'Rolls PRODUCTION back to an older deployment. Approve?', ref);
    case 'assign_alias':
      return ask('vercel-alias', 'Moving an alias can switch live traffic to a different deployment. Approve?', ref);
    case 'pause_project':
      return ask('vercel-pause', 'Pausing a Vercel project takes the site offline. Approve?', ref);
    case 'use_vercel_cli':
      if (/--prod\b|--target[= ]production|\bpromote\b|\brollback\b/.test(String(input.command || ''))) {
        return ask('vercel-cli-production', 'This Vercel CLI command changes PRODUCTION. Approve?', ref);
      }
      return null;
    default:
      return null;
  }
}

function checkMcp(name, input, cfg) {
  const mcp = parseMcpName(name);
  if (!mcp) return null;
  if (mcp.server.includes('supabase')) {
    const r = checkSupabase(mcp.tool, input, cfg);
    if (r) return r;
  }
  if (mcp.server.includes('vercel')) {
    const r = checkVercel(mcp.tool, input);
    if (r) return r;
  }
  if (BILLING_RE.test(mcp.tool) && !READ_PREFIX_RE.test(mcp.tool)) {
    return ask('billing', `${mcp.tool} can spend money. Approve?`, input.project_id || input.projectId || input.teamId);
  }
  return null;
}

// ---------------------------------------------------------------- main

function decide(event, cfg) {
  const name = event.tool_name || '';
  const input = event.tool_input || {};
  if (name === 'Bash') return checkBash(input, event.cwd, cfg);
  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(name)) return checkWrite(name, input);
  if (name.startsWith('mcp__')) return checkMcp(name, input, cfg);
  return null;
}

function respond(result, cfg, toolName) {
  if (!result) return process.exit(0);
  writeLog(cfg, result.decision.toUpperCase(), toolName, result.rule, result.ref);
  const reason = `[gatekeeper:${result.rule}] ${result.reason} If this is needed, hand it to escalation-desk.`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: result.decision,
      permissionDecisionReason: reason,
    },
  }));
  if (result.decision === 'deny') {
    process.stderr.write(reason + '\n');
    process.exit(2);
  }
  process.exit(0);
}

function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    const cfg = loadConfig();
    let event = {};
    try {
      event = JSON.parse(raw || '{}');
      if (cfg.configError) writeLog(cfg, 'WARN', event.tool_name, 'config-error', '-');
      respond(decide(event, cfg), cfg, event.tool_name);
    } catch (err) {
      // Fail safe, not open: an internal error asks instead of silently allowing.
      respond(ask('gatekeeper-error', `Gatekeeper could not evaluate this call (${err && err.name}). Review it manually.`), cfg, event.tool_name);
    }
  });
}

if (require.main === module) main();
module.exports = { decide, findSecret, isDestructiveSql, isWriteSql, loadConfig };
