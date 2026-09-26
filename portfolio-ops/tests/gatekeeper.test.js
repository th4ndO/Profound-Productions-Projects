#!/usr/bin/env node
// Pipes fake PreToolUse events into gatekeeper.js and prints a results table.
// Nothing here touches a real database, deployment, or remote: every call is fake JSON.
//
//   node portfolio-ops/tests/gatekeeper.test.js            (tests the kit copy)
//   node portfolio-ops/tests/gatekeeper.test.js <path-to-gatekeeper.js>

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const HOOK = path.resolve(process.argv[2] || path.join(__dirname, '..', 'kit', 'claude', 'hooks', 'gatekeeper.js'));
const CONFIG = path.join(path.dirname(HOOK), 'gatekeeper.config.json');

// Isolated sandbox: config copy, log, and a throwaway git repo on "main".
const box = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-test-'));
fs.copyFileSync(CONFIG, path.join(box, 'gatekeeper.config.json'));
const repo = path.join(box, 'repo');
fs.mkdirSync(repo);
const git = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'ignore' });
git('init', '-q', '-b', 'main');
fs.writeFileSync(path.join(repo, '.gitignore'), '.env.production\n');

// Fake secrets are assembled at runtime so this file itself contains no secret-shaped strings.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = (role) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ iss: 'supabase', ref: 'fake', role, iat: 1 })}.${'s'.repeat(43)}`;
const LIVE_KEY = 'sk' + '_live_' + 'X'.repeat(24);
const SERVICE_JWT = fakeJwt('service_role');
const ANON_JWT = fakeJwt('anon');
const SR_ASSIGN = 'SUPABASE_SERVICE_ROLE_KEY' + '=' + SERVICE_JWT;

const RED = 'xvpdqldlqbtafcbycwxp';
const RED2 = 'whvmbftpbrqkygnltvvz';
const AMBER = 'ofbitzqczupdobofuosh';
const GREEN = 'ulbzuafadfxdymrtdzgy';
const SB = 'mcp__Supabase__';
const VC = 'mcp__Vercel__';

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command }, cwd: repo });
const tool = (tool_name, tool_input) => ({ tool_name, tool_input, cwd: repo });

const cases = [
  // ---- DENY
  ['DENY', 'git push --force to main', bash('git push --force origin main')],
  ['DENY', 'git push -f with no refspec while on main', bash('git push -f')],
  ['DENY', 'force via +refspec, chained after cd', bash('cd app && git push origin +master')],
  ['DENY', 'git push HEAD:main --force-with-lease', bash('git push origin HEAD:main --force-with-lease')],
  ['DENY', 'supabase db reset (via npx)', bash('npx supabase db reset --linked')],
  ['DENY', 'execute_sql DROP on RED (Coco Bliss)', tool(SB + 'execute_sql', { project_id: RED, query: 'DROP TABLE orders;' })],
  ['DENY', 'execute_sql DELETE on RED (network-growth)', tool(SB + 'execute_sql', { project_id: RED2, query: 'delete from members where id = 1' })],
  ['DENY', 'apply_migration ALTER on RED', tool(SB + 'apply_migration', { project_id: RED, name: 'add_col', query: 'ALTER TABLE products ADD COLUMN x int;' })],
  ['DENY', 'TRUNCATE on RED via differently-named server', tool('mcp__claude_ai_Supabase__execute_sql', { project_id: RED, query: 'truncate orders' })],
  ['DENY', 'delete_branch given a project ref', tool(SB + 'delete_branch', { branch_id: RED })],
  ['DENY', 'pause_project on RED', tool(SB + 'pause_project', { project_id: RED2 })],
  ['DENY', 'Write sk_live key into source', tool('Write', { file_path: path.join(repo, 'lib/yoco.ts'), content: `const k = "${LIVE_KEY}";` })],
  ['DENY', 'Edit adds SERVICE_ROLE_KEY= to source', tool('Edit', { file_path: path.join(repo, 'config.ts'), old_string: 'a', new_string: SR_ASSIGN })],
  ['DENY', 'Write service_role JWT into source', tool('Write', { file_path: path.join(repo, 'lib/admin.ts'), content: `createClient(url, "${SERVICE_JWT}")` })],
  ['DENY', 'Write secret into .env.example (committed)', tool('Write', { file_path: path.join(repo, '.env.example'), content: SR_ASSIGN })],
  ['DENY', 'Write secret into NOT-ignored .env.staging', tool('Write', { file_path: path.join(repo, '.env.staging'), content: SR_ASSIGN })],
  // ---- ASK
  ['ASK', 'vercel deploy --prod', bash('vercel deploy --prod')],
  ['ASK', 'npx vercel --target production', bash('npx vercel --target production')],
  ['ASK', 'Vercel MCP create_deployment target=production', tool(VC + 'create_deployment', { requestBody: { name: 'coco-bliss-project-v2', target: 'production' } })],
  ['ASK', 'Vercel MCP request_promote', tool(VC + 'request_promote', { projectId: 'prj_x', deploymentId: 'dpl_x' })],
  ['ASK', 'Vercel MCP request_rollback', tool(VC + 'request_rollback', { projectId: 'prj_x', deploymentId: 'dpl_x' })],
  ['ASK', 'execute_sql INSERT on RED', tool(SB + 'execute_sql', { project_id: RED, query: "insert into orders(total) values (10)" })],
  ['ASK', 'apply_migration CREATE INDEX on RED', tool(SB + 'apply_migration', { project_id: RED, name: 'idx', query: 'create index on orders(created_at);' })],
  ['ASK', 'CREATE TABLE with ON DELETE CASCADE on RED (write, not destructive)', tool(SB + 'apply_migration', { project_id: RED, name: 't', query: 'create table t (id int references orders(id) on delete cascade);' })],
  ['ASK', 'merge_branch (always: merges to production)', tool(SB + 'merge_branch', { branch_id: 'br_abc123' })],
  ['ASK', 'restore_project on RED', tool(SB + 'restore_project', { project_id: RED })],
  ['ASK', 'Vercel buy_domain (billing)', tool(VC + 'buy_domain', { domain: 'x.co.za', teamId: 'team_x' })],
  ['ASK', 'Supabase create_project (billing)', tool(SB + 'create_project', { name: 'x', region: 'eu-west-1', organization_id: 'o' })],
  ['ASK', 'git push -f outside any repo (branch unknown)', { tool_name: 'Bash', tool_input: { command: 'git push -f' }, cwd: os.tmpdir() }],
  ['ASK', 'malformed tool input -> fail safe', { tool_name: 'Bash', tool_input: null, cwd: repo, _raw: '{not json' }],
  // ---- PASS
  ['pass', 'git push to feature branch', bash('git push -u origin feature/checkout')],
  ['pass', 'force push to a feature branch', bash('git push --force origin feature/checkout')],
  ['pass', 'vercel deploy (preview)', bash('vercel deploy')],
  ['pass', 'SELECT on RED', tool(SB + 'execute_sql', { project_id: RED, query: 'select count(*) from orders' })],
  ['pass', "SELECT on RED with 'drop' inside a string", tool(SB + 'execute_sql', { project_id: RED, query: "select * from orders where note = 'drop table'" })],
  ['pass', 'DROP on GREEN (CampusHustle)', tool(SB + 'execute_sql', { project_id: GREEN, query: 'drop table tmp_import' })],
  ['pass', 'migration on AMBER', tool(SB + 'apply_migration', { project_id: AMBER, name: 'p', query: 'alter table projects enable row level security;' })],
  ['pass', 'delete_branch with a real branch id', tool(SB + 'delete_branch', { branch_id: 'br_abc123' })],
  ['pass', 'Write service key into .env.local', tool('Write', { file_path: path.join(repo, '.env.local'), content: SR_ASSIGN })],
  ['pass', 'Write service key into gitignored .env.production', tool('Write', { file_path: path.join(repo, '.env.production'), content: SR_ASSIGN })],
  ['pass', 'Write public anon JWT into source', tool('Write', { file_path: path.join(repo, 'lib/supabase.ts'), content: `createClient(url, "${ANON_JWT}")` })],
  ['pass', 'Write RLS policy that mentions service_role', tool('Write', { file_path: path.join(repo, 'supabase/migrations/1.sql'), content: 'create policy p on orders for all to service_role using (true);' })],
  ['pass', 'Vercel get_purchase_quote (read-only)', tool(VC + 'get_purchase_quote', { product: 'domain', teamId: 't' })],
  ['pass', 'Vercel list_billing_charges (read-only)', tool(VC + 'list_billing_charges', {})],
  ['pass', 'Vercel create_deployment preview', tool(VC + 'create_deployment', { requestBody: { name: 'hustle-corner' } })],
];

function run(event) {
  const input = event._raw !== undefined ? event._raw : JSON.stringify(event);
  const r = spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8', env: { ...process.env, GATEKEEPER_DIR: box } });
  let decision = 'pass';
  let reason = '';
  if (r.stdout.trim()) {
    const out = JSON.parse(r.stdout).hookSpecificOutput;
    decision = out.permissionDecision.toUpperCase();
    reason = out.permissionDecisionReason;
  }
  if (decision === 'DENY' && r.status !== 2) decision = `DENY(exit ${r.status}!)`;
  if (decision !== 'DENY' && r.status !== 0) decision += `(exit ${r.status}!)`;
  const rule = (reason.match(/\[gatekeeper:([^\]]+)\]/) || [])[1] || '';
  return { decision, rule };
}

let failed = 0;
const rows = cases.map(([expected, label, event], i) => {
  const { decision, rule } = run(event);
  const ok = decision === expected;
  if (!ok) failed++;
  return `| ${i + 1} | ${label} | ${expected} | ${decision} | ${rule || '-'} | ${ok ? 'OK' : '**FAIL**'} |`;
});

console.log('| # | Test case | Expected | Actual | Rule | Result |');
console.log('|---|---|---|---|---|---|');
console.log(rows.join('\n'));

// The log must have one line per DENY/ASK and must never contain commands, SQL, or secrets.
const log = fs.existsSync(path.join(box, 'gatekeeper.log')) ? fs.readFileSync(path.join(box, 'gatekeeper.log'), 'utf8') : '';
const lines = log.trim().split('\n').filter(Boolean);
const expectedLines = cases.filter(([e]) => e !== 'pass').length;
const leaks = [LIVE_KEY, SERVICE_JWT, 'DROP TABLE', 'truncate', 'git push', 'insert into', 'supabase db reset', 'orders']
  .filter((s) => log.toLowerCase().includes(s.toLowerCase()));
const shapeOk = lines.every((l) => /^\d{4}-\d\d-\d\dT[\d:.]+Z (DENY|ASK) \S+ [a-z0-9-]+ \S+$/.test(l));
console.log('');
console.log(`Log: ${lines.length} lines (expected ${expectedLines}); format ${shapeOk ? 'OK' : 'BAD'}; leaked content: ${leaks.length ? leaks.join(', ') : 'none'}`);
console.log('Sample log lines:');
for (const l of lines.slice(0, 3)) console.log('  ' + l);
if (lines.length !== expectedLines || !shapeOk || leaks.length) failed++;

console.log('');
console.log(failed ? `${failed} FAILURE(S)` : `ALL ${cases.length} CASES PASSED + log check passed`);
fs.rmSync(box, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
