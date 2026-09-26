-- Attack tests for reminder_rules goal ownership
-- (migration 20260927090000_reminder_rules_goal_ownership.sql).
--
-- Runs in one transaction that is rolled back: seeds two users (A, B), one goal
-- and one rule each, then tries each operation as anon, as A and as B. Output
-- is one row per test: name, expected, actual, pass. It reports counts and
-- outcomes only, never row contents.
--
-- Outcomes: 'denied' = RLS rejected the row (SQLSTATE 42501);
--           'rows=N' = statement succeeded and affected or returned N rows.
--
-- Run as the postgres role, e.g. psql -f, or the Supabase SQL editor on a branch.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'rls-test-a@example.invalid', '', now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'rls-test-b@example.invalid', '', now(), 'authenticated', 'authenticated');

insert into public.goals (id, user_id, title, theme) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A goal', 'tree'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'B goal', 'tree');

insert into public.reminder_rules (id, goal_id, user_id, days_of_week, local_time) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '{1}', '08:00'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '{1}', '08:00');

create temp table rls_results (n serial, test text, expected text, actual text);
grant insert, select on rls_results to anon, authenticated;
grant usage on sequence rls_results_n_seq to anon, authenticated;

-- Runs stmt as the current role (security invoker) and records the outcome.
create function pg_temp.t(test text, expected text, stmt text) returns void
language plpgsql as $$
declare n bigint; outcome text;
begin
  begin
    if stmt ilike 'select%' then
      execute stmt into n;
    else
      execute stmt;
      get diagnostics n = row_count;
    end if;
    outcome := 'rows=' || n;
  exception
    when insufficient_privilege then outcome := 'denied';
    when others then outcome := 'error ' || sqlstate;
  end;
  insert into pg_temp.rls_results (test, expected, actual) values (test, expected, outcome);
end $$;

-- anon ------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.t('anon select reminder_rules', 'rows=0', 'select count(*) from public.reminder_rules');
select pg_temp.t('anon insert rule on A goal', 'denied',
  $q$insert into public.reminder_rules (goal_id, user_id, days_of_week, local_time) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','{2}','09:00')$q$);
select pg_temp.t('anon update A rule', 'rows=0', $q$update public.reminder_rules set enabled = false where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('anon delete A rule', 'rows=0', $q$delete from public.reminder_rules where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
reset role;

-- user A ----------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select pg_temp.t('A select own rules', 'rows=1', 'select count(*) from public.reminder_rules');
select pg_temp.t('A insert rule on own goal', 'rows=1',
  $q$insert into public.reminder_rules (goal_id, user_id, days_of_week, local_time) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','{2}','09:00')$q$);
select pg_temp.t('A update own rule (own goal)', 'rows=1',
  $q$update public.reminder_rules set local_time = '10:00', goal_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('A repoint own rule to B goal', 'denied',
  $q$update public.reminder_rules set goal_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
reset role;

-- user B (attacker) -----------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select pg_temp.t('B select A rules', 'rows=0', $q$select count(*) from public.reminder_rules where user_id = '11111111-1111-1111-1111-111111111111'$q$);
select pg_temp.t('B insert own-user rule on A goal', 'denied',
  $q$insert into public.reminder_rules (goal_id, user_id, days_of_week, local_time) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','{3}','07:00')$q$);
select pg_temp.t('B insert A-user rule on A goal', 'denied',
  $q$insert into public.reminder_rules (goal_id, user_id, days_of_week, local_time) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','{3}','07:00')$q$);
select pg_temp.t('B repoint own rule to A goal', 'denied',
  $q$update public.reminder_rules set goal_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'$q$);
select pg_temp.t('B update A rule', 'rows=0', $q$update public.reminder_rules set enabled = false where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('B delete A rule', 'rows=0', $q$delete from public.reminder_rules where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('B insert rule on own goal', 'rows=1',
  $q$insert into public.reminder_rules (goal_id, user_id, days_of_week, local_time) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222','{3}','07:00')$q$);
select pg_temp.t('B update own rule (own goal)', 'rows=1',
  $q$update public.reminder_rules set local_time = '06:30' where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'$q$);
reset role;

-- Cross-check as postgres: no rule points at a goal owned by someone else.
select pg_temp.t('postgres: cross-owner rules after tests', 'rows=0',
  'select count(*) from public.reminder_rules r join public.goals g on g.id = r.goal_id where g.user_id <> r.user_id');

select test, expected, actual, case when actual = expected then 'PASS' else 'FAIL' end as result
from pg_temp.rls_results order by n;

rollback;
