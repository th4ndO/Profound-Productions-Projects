#!/usr/bin/env node
// Pipes fake tool calls into agent-guard.js for each mode and prints a results table.
//   node portfolio-ops/tests/agent-guard.test.js

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.resolve(process.argv[2] || path.join(__dirname, '..', 'kit', 'claude', 'hooks', 'agent-guard.js'));
const box = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-guard-test-'));
const home = path.join(box, 'home');
fs.mkdirSync(home);

const RED = 'xvpdqldlqbtafcbycwxp';
const AMBER = 'ofbitzqczupdobofuosh';
const BRANCH = 'abcdefghijklmnopqrst'; // a branch ref: not in knownProjectRefs
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const sql = (project_id, query) => ({ tool_name: 'mcp__Supabase__execute_sql', tool_input: { project_id, query } });

const cases = [
  // readonly (health-triage, innovator, gatekeeper-reviewer)
  ['readonly', 'DENY', 'npm audit fix', bash('npm audit fix')],
  ['readonly', 'DENY', 'npm install', bash('npm install lodash')],
  ['readonly', 'DENY', 'npx anything', bash('npx depcheck')],
  ['readonly', 'DENY', 'git commit', bash('git commit -am "x"')],
  ['readonly', 'DENY', 'git push hidden after a read', bash('git status && git push')],
  ['readonly', 'DENY', 'redirect output into a file', bash('npm audit --json > audit.json')],
  ['readonly', 'DENY', 'rm', bash('rm -rf node_modules')],
  ['readonly', 'DENY', 'find -delete', bash('find . -name "*.log" -delete')],
  ['readonly', 'DENY', 'gh issue create without issues mode', bash('gh issue create -t x -b y')],
  ['readonly', 'DENY', 'gh api POST', bash('gh api repos/o/r/issues -f title=x')],
  ['readonly', 'DENY', 'Write outside ~/.claude/reports', { tool_name: 'Write', tool_input: { file_path: path.join(home, 'repo', 'src', 'a.ts'), content: 'x' } }],
  ['readonly', 'pass', 'npm audit --json (lockfile only)', bash('cd ../app && npm audit --package-lock-only --json 2>/dev/null')],
  ['readonly', 'pass', 'npm outdated --json', bash('npm outdated --json')],
  ['readonly', 'pass', 'npm view next version', bash('npm view next version')],
  ['readonly', 'pass', 'git -C repo log', bash('git -C ../repo log --oneline -5')],
  ['readonly', 'pass', 'rg across repos piped to wc', bash('rg -l "createClient" ../ | wc -l')],
  ['readonly', 'pass', 'gh issue list', bash('gh issue list --state open')],
  ['readonly', 'pass', 'gh api GET', bash('gh api repos/o/r/issues')],
  ['readonly', 'pass', 'Write report under ~/.claude/reports', { tool_name: 'Write', tool_input: { file_path: path.join(home, '.claude', 'reports', 'health-2026-09-27.md'), content: 'x' } }],
  ['readonly,issues', 'pass', 'gh issue create in issues mode', bash('gh issue create -t "x" -b "y"')],
  // branch-only (schema-keeper, data-steward)
  ['branch-only', 'DENY', 'execute_sql on RED production ref', sql(RED, 'select 1')],
  ['branch-only', 'DENY', 'apply_migration on AMBER production ref', { tool_name: 'mcp__Supabase__apply_migration', tool_input: { project_id: AMBER, name: 'x', query: 'create table t(id int)' } }],
  ['branch-only', 'pass', 'apply_migration on a branch ref', { tool_name: 'mcp__Supabase__apply_migration', tool_input: { project_id: BRANCH, name: 'x', query: 'create table t(id int)' } }],
  ['branch-only', 'pass', 'get_advisors on production (read)', { tool_name: 'mcp__Supabase__get_advisors', tool_input: { project_id: RED, type: 'security' } }],
  // finance (finance-reporter)
  ['finance', 'DENY', 'query without the read-only role', sql(RED, 'select sum(total) from orders')],
  ['finance', 'DENY', 'role switch followed by a write', sql(RED, 'set role finance_readonly; update orders set total = 0')],
  ['finance', 'DENY', 'apply_migration', { tool_name: 'mcp__Supabase__apply_migration', tool_input: { project_id: RED, name: 'x', query: 'select 1' } }],
  ['finance', 'pass', 'begin; set local role; select; rollback', sql(RED, 'begin; set local role finance_readonly; select product_id, sum(total) from orders group by 1; rollback;')],
  // no-raw-data (data-steward)
  ['no-raw-data', 'DENY', 'Read tool on a CSV', { tool_name: 'Read', tool_input: { file_path: 'C:/Users/me/Downloads/members.csv' } }],
  ['no-raw-data', 'DENY', 'head on an xlsx', bash('head -20 "members export.xlsx"')],
  ['no-raw-data', 'pass', 'node script that prints aggregates', bash('node scripts/profile-import.js members.csv')],
  ['no-raw-data', 'pass', 'Read the import script itself', { tool_name: 'Read', tool_input: { file_path: 'scripts/profile-import.js' } }],
];

let failed = 0;
// Fail-closed check: a guard copied without gatekeeper.js next to it must deny, not crash.
const lonely = path.join(box, 'lonely');
fs.mkdirSync(lonely);
fs.copyFileSync(HOOK, path.join(lonely, 'agent-guard.js'));
const fc = spawnSync(process.execPath, [path.join(lonely, 'agent-guard.js'), 'readonly'], {
  input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'ls' } }), encoding: 'utf8', env: { ...process.env, GATEKEEPER_DIR: box },
});
const fcOk = fc.status === 2;
if (!fcOk) failed++;
console.log(`Fail-closed when gatekeeper.js is missing: exit ${fc.status} ${fcOk ? 'OK (denied)' : '**FAIL**'}\n`);

console.log('| # | Mode | Test case | Expected | Actual | Result |');
console.log('|---|---|---|---|---|---|');
cases.forEach(([mode, expected, label, event], i) => {
  const r = spawnSync(process.execPath, [HOOK, mode], {
    input: JSON.stringify({ ...event, agent_type: 'test-agent' }), encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, GATEKEEPER_DIR: box },
  });
  let actual = r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput.permissionDecision.toUpperCase() : 'pass';
  if (actual === 'DENY' && r.status !== 2) actual += `(exit ${r.status}!)`;
  if (actual === 'pass' && r.status !== 0) actual = `pass(exit ${r.status}!) ${r.stderr.trim()}`;
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`| ${i + 1} | ${mode} | ${label} | ${expected} | ${actual} | ${ok ? 'OK' : '**FAIL**'} |`);
});

const log = fs.existsSync(path.join(box, 'gatekeeper.log')) ? fs.readFileSync(path.join(box, 'gatekeeper.log'), 'utf8') : '';
const leaks = ['audit fix', 'orders', 'members', 'rm -rf', 'git push'].filter((s) => log.includes(s));
const denies = cases.filter((c) => c[1] === 'DENY').length + 1; // +1 for the fail-closed check
const lines = log.trim().split('\n').filter(Boolean).length;
console.log(`\nLog: ${lines} lines (expected ${denies}); leaked content: ${leaks.length ? leaks.join(', ') : 'none'}`);
if (lines !== denies || leaks.length) failed++;
console.log(failed ? `${failed} FAILURE(S)` : `ALL ${cases.length} CASES PASSED + log check passed`);
fs.rmSync(box, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
