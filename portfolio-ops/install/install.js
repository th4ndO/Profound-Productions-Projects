#!/usr/bin/env node
// Portfolio agent kit installer. Cross-platform (Windows/macOS/Linux), no bash.
//
// Usage (run from anywhere):
//   node install.js backup              Phase 0: copy ~/.claude to ~/.claude-backup-YYYY-MM-DD and verify
//   node install.js registry            Phase 1: install PORTFOLIO.md and the Portfolio Lead section of CLAUDE.md
//   node install.js hooks               Phase 2: install gatekeeper.js + config, merge the hook into settings.json
//   node install.js agents [--mcp-rename Supabase=claude_ai_Supabase,Vercel=claude_ai_Vercel]
//                                       Phase 3: install the 8 new agents + agent-guard.js (never overwrites)
//   node install.js ops [--docs <Documents folder>]
//                                       Phase 4: copy ops files to <Documents>/ProfoundProductions/portfolio-ops/
//   node install.js agents-report       List every agent in ~/.claude/agents (name, tools, description)
//   --home <dir>                        Treat <dir> as the home folder (for testing)
//
// Every step after "backup" refuses to run unless today's backup exists.
//
// Later phases add more steps. Every step is safe to re-run and never deletes anything.

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

function parseArgs(argv) {
  const args = { step: argv[0], home: os.homedir(), rename: {} };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--home') args.home = path.resolve(argv[++i]);
    else if (argv[i] === '--docs') args.docs = path.resolve(argv[++i]);
    else if (argv[i] === '--mcp-rename') {
      for (const pair of String(argv[++i] || '').split(',').filter(Boolean)) {
        const [from, to] = pair.split('=');
        args.rename[from] = to;
      }
    }
  }
  return args;
}

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Walks a tree and returns { files, bytes } so the copy can be verified.
function inventory(dir) {
  let files = 0;
  let bytes = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        files++;
        bytes += fs.statSync(full).size;
      }
    }
  }
  return { files, bytes };
}

function backup(home) {
  const src = path.join(home, '.claude');
  if (!fs.existsSync(src)) {
    console.error(`No ${src} found. Nothing to back up; stopping.`);
    process.exit(1);
  }

  // Never overwrite an earlier backup: add -2, -3, ... if today's already exists.
  let dest = path.join(home, `.claude-backup-${today()}`);
  for (let n = 2; fs.existsSync(dest); n++) {
    dest = path.join(home, `.claude-backup-${today()}-${n}`);
  }

  fs.cpSync(src, dest, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true });

  const a = inventory(src);
  const b = inventory(dest);
  const ok = a.files === b.files && a.bytes === b.bytes;
  console.log(`Source : ${src}  (${a.files} files, ${a.bytes} bytes)`);
  console.log(`Backup : ${dest}  (${b.files} files, ${b.bytes} bytes)`);
  console.log(ok ? 'BACKUP VERIFIED' : 'BACKUP MISMATCH - do not continue');
  if (!ok) process.exit(2);
  return dest;
}

const KIT = path.join(__dirname, '..', 'kit', 'claude');

function requireBackup(home) {
  if (!fs.existsSync(path.join(home, `.claude-backup-${today()}`))) {
    console.error(`No ~/.claude-backup-${today()} found. Run "node install.js backup" first.`);
    process.exit(3);
  }
}

// Copies a kit file into ~/.claude. If a different version already exists, it is left
// alone and the kit version is written next to it as <name>.kit-new for manual review.
function installFile(home, rel, transform) {
  const src = path.join(KIT, rel);
  const dest = path.join(home, '.claude', rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const incoming = transform ? Buffer.from(transform(fs.readFileSync(src, 'utf8'))) : fs.readFileSync(src);
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, incoming);
    console.log(`created   ${dest}`);
  } else if (fs.readFileSync(dest).equals(incoming)) {
    console.log(`unchanged ${dest}`);
  } else {
    fs.writeFileSync(dest + '.kit-new', incoming);
    console.log(`KEPT      ${dest} (differs from kit; kit version saved as ${path.basename(dest)}.kit-new for you to diff)`);
  }
}

const LEAD_BEGIN = '<!-- BEGIN portfolio-lead';
const LEAD_END = '<!-- END portfolio-lead -->';

// Appends the Portfolio Lead block to ~/.claude/CLAUDE.md, or replaces only the
// previously installed block. Text outside the markers is never touched.
function installLead(home) {
  const dest = path.join(home, '.claude', 'CLAUDE.md');
  const block = fs.readFileSync(path.join(KIT, 'portfolio-lead.md'), 'utf8').trim();
  const existing = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  const start = existing.indexOf(LEAD_BEGIN);
  const end = existing.indexOf(LEAD_END);
  let next;
  if (start !== -1 && end > start) {
    next = existing.slice(0, start) + block + existing.slice(end + LEAD_END.length);
  } else {
    next = existing + (existing && !existing.endsWith('\n\n') ? (existing.endsWith('\n') ? '\n' : '\n\n') : '') + block + '\n';
  }
  if (next === existing) return console.log(`unchanged ${dest}`);
  fs.writeFileSync(dest, next);
  console.log(`${existing ? 'updated  ' : 'created  '} ${dest} (Portfolio Lead section)`);
}

// Merges the gatekeeper PreToolUse entries into ~/.claude/settings.json without touching
// anything else. A copy of the previous file is kept as settings.json.pre-gatekeeper.
function installHookSettings(home) {
  const file = path.join(home, '.claude', 'settings.json');
  const script = path.join(home, '.claude', 'hooks', 'gatekeeper.js').split(path.sep).join('/');
  // Plain command string (not exec-form "args"): older Claude Code versions ignore "args",
  // and "node" alone would then read the event as a script and fail open.
  const command = `node "${script}"`;
  let settings = {};
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    try {
      settings = JSON.parse(raw);
    } catch (e) {
      console.error(`${file} is not valid JSON (${e.message}). Fix it first; nothing was changed.`);
      process.exit(4);
    }
  }
  settings.hooks = settings.hooks || {};
  const pre = (settings.hooks.PreToolUse = settings.hooks.PreToolUse || []);
  const matchers = ['Bash', 'Write|Edit|MultiEdit|NotebookEdit', 'mcp__.*'];
  let added = 0;
  for (const matcher of matchers) {
    const present = pre.some((e) => e.matcher === matcher &&
      (e.hooks || []).some((h) => String(h.command || '').includes('gatekeeper.js')));
    if (present) continue;
    pre.push({ matcher, hooks: [{ type: 'command', command, timeout: 15 }] });
    added++;
  }
  if (!added) return console.log(`unchanged ${file} (gatekeeper hooks already registered)`);
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.pre-gatekeeper');
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  console.log(`updated   ${file} (+${added} PreToolUse matcher${added > 1 ? 's' : ''}; previous copy: settings.json.pre-gatekeeper)`);
}

const PP_AGENT_KIT = ['architect', 'site-scaffold', 'client-copywriter', 'code-reviewer', 'security-auditor',
  'launch-auditor', 'qa-tester', 'handover-pack', 'care-plan-runbook', 'site-medic'];

// Agent files reference hooks as "$HOME/.claude/hooks/..." and MCP tools by their cloud
// server names (mcp__Supabase__...). Locally the hook path becomes absolute and, if your
// servers are named differently (see /mcp), --mcp-rename maps them.
function agentTransform(home, rename) {
  const hooks = path.join(home, '.claude', 'hooks').split(path.sep).join('/');
  return (text) => {
    let out = text.split('$HOME/.claude/hooks').join(hooks);
    for (const [from, to] of Object.entries(rename)) out = out.split(`mcp__${from}__`).join(`mcp__${to}__`);
    return out;
  };
}

function installAgents(home, rename) {
  if (!fs.existsSync(path.join(home, '.claude', 'hooks', 'gatekeeper.js'))) {
    console.error('Run "node install.js hooks" first: agent-guard.js depends on gatekeeper.js.');
    process.exit(6);
  }
  const names = fs.readdirSync(path.join(KIT, 'agents')).filter((f) => f.endsWith('.md'));
  for (const f of names) {
    if (PP_AGENT_KIT.includes(path.basename(f, '.md'))) {
      console.error(`refusing: ${f} has the same name as a pp-agent-kit agent`);
      process.exit(5);
    }
  }
  installFile(home, 'hooks/agent-guard.js');
  for (const f of names) installFile(home, path.join('agents', f), agentTransform(home, rename));
}

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^(name|description|tools|model):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return fm;
}

function agentsReport(home) {
  const dir = path.join(home, '.claude', 'agents');
  if (!fs.existsSync(dir)) return console.log(`No ${dir}`);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const fm = frontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    const origin = PP_AGENT_KIT.includes(path.basename(f, '.md')) ? 'pp-agent-kit' : 'portfolio-ops';
    console.log(`## ${fm.name || f}  [${origin}]`);
    console.log(`tools: ${fm.tools || '(all inherited)'}`);
    console.log(`${fm.description || '(no description)'}\n`);
  }
}

// Copies portfolio-ops/ops/* into Documents without overwriting edited copies.
function installOps(home, docsArg) {
  const docs = docsArg || path.join(home, 'Documents');
  const oneDrive = path.join(home, 'OneDrive', 'Documents');
  if (!docsArg && fs.existsSync(oneDrive)) {
    console.log(`note: ${oneDrive} exists. If Windows redirects Documents to OneDrive, re-run with --docs "${oneDrive}".`);
  }
  const destDir = path.join(docs, 'ProfoundProductions', 'portfolio-ops');
  fs.mkdirSync(destDir, { recursive: true });
  const srcDir = path.join(__dirname, '..', 'ops');
  for (const f of fs.readdirSync(srcDir)) {
    const dest = path.join(destDir, f);
    const incoming = fs.readFileSync(path.join(srcDir, f));
    if (!fs.existsSync(dest)) { fs.writeFileSync(dest, incoming); console.log(`created   ${dest}`); }
    else if (fs.readFileSync(dest).equals(incoming)) console.log(`unchanged ${dest}`);
    else { fs.writeFileSync(dest + '.kit-new', incoming); console.log(`KEPT      ${dest} (kit version saved as ${f}.kit-new)`); }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  switch (args.step) {
    case 'backup':
      backup(args.home);
      break;
    case 'registry':
      requireBackup(args.home);
      installFile(args.home, 'PORTFOLIO.md');
      installLead(args.home);
      break;
    case 'hooks':
      requireBackup(args.home);
      installFile(args.home, 'hooks/gatekeeper.js');
      installFile(args.home, 'hooks/gatekeeper.config.json');
      installHookSettings(args.home);
      break;
    case 'agents':
      requireBackup(args.home);
      installAgents(args.home, args.rename);
      break;
    case 'ops':
      installOps(args.home, args.docs);
      break;
    case 'agents-report':
      agentsReport(args.home);
      break;
    default:
      console.log('Usage: node install.js <backup|registry|hooks|agents|ops|agents-report> [--home <dir>]');
      process.exit(args.step ? 1 : 0);
  }
}

main();
