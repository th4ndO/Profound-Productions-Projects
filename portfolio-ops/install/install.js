#!/usr/bin/env node
// Portfolio agent kit installer. Cross-platform (Windows/macOS/Linux), no bash.
//
// Usage (run from anywhere):
//   node install.js backup              Phase 0: copy ~/.claude to ~/.claude-backup-YYYY-MM-DD and verify
//   node install.js backup --home <dir> Same, but treat <dir> as the home folder (for testing)
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  switch (args.step) {
    case 'backup':
      backup(args.home);
      break;
    default:
      console.log('Usage: node install.js backup [--home <dir>]');
      process.exit(args.step ? 1 : 0);
  }
}

main();
