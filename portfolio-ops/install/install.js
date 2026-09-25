#!/usr/bin/env node
// Portfolio agent kit installer. Cross-platform (Windows/macOS/Linux), no bash.
//
// Usage (run from anywhere):
//   node install.js backup              Phase 0: copy ~/.claude to ~/.claude-backup-YYYY-MM-DD and verify
//   node install.js registry            Phase 1: install PORTFOLIO.md and the Portfolio Lead section of CLAUDE.md
//   node install.js hooks               Phase 2: install gatekeeper.js + config, merge the hook into settings.json
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
  const args = { step: argv[0], home: os.homedir() };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--home') args.home = path.resolve(argv[++i]);
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
function installFile(home, rel) {
  const src = path.join(KIT, rel);
  const dest = path.join(home, '.claude', rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const incoming = fs.readFileSync(src);
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
    default:
      console.log('Usage: node install.js <backup|registry|hooks> [--home <dir>]');
      process.exit(args.step ? 1 : 0);
  }
}

main();
