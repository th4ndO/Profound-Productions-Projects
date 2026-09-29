-- Tests for the daily planner (migration 20260929120000_day_planner.sql):
-- day_tasks RLS, the kind/goal_id check, the profiles day window, and the
-- stale-anonymous cleanup keeping users who only have day_tasks.
--
-- One transaction, rolled back. Output is one row per test: name, expected,
-- actual, pass; then a passed/failed count. Counts and outcomes only, never
-- row contents.
--
-- Outcomes: 'denied'      = RLS or privileges rejected it (SQLSTATE 42501);
--           'check'       = a check constraint rejected it (SQLSTATE 23514);
--           'rows=N'      = statement succeeded and affected or returned N rows.
--
-- WRITES TO auth.users: local Postgres (or a branch) only, never production.
-- Run as the postgres role (psql -f).

begin;

-- Stale users already in the database (0 on a fresh database) are also
-- deleted by the cleanup call, so its expected return value is 1 + this.
create temp table pre (n int);
insert into pre
select count(*) from auth.users u
where u.is_anonymous
  and u.created_at < now() - interval '30 days'
  and not exists (select 1 from public.goals g where g.user_id = u.id)
  and not exists (select 1 from public.reminder_rules r where r.user_id = u.id)
  and not exists (select 1 from public.push_subscriptions p where p.user_id = u.id)
  and not exists (select 1 from public.profiles pr where pr.user_id = u.id)
  and not exists (select 1 from public.day_tasks d where d.user_id = u.id);

-- A and B: saved accounts. C: old anonymous user whose only data is one
-- day_task. E: old anonymous user with no data at all.
insert into auth.users (id, aud, role, email, is_anonymous, created_at) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'planner-test-a@example.invalid', false, now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'planner-test-b@example.invalid', false, now()),
  ('c0000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', null, true, now() - interval '60 days'),
  ('e0000000-0000-0000-0000-00000000000e', 'authenticated', 'authenticated', null, true, now() - interval '60 days');

insert into public.goals (id, user_id, title, theme) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A goal', 'tree'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'B goal', 'tree');

insert into public.day_tasks (id, user_id, day, title, minutes) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', current_date, 'A task', 30),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', '22222222-2222-2222-2222-222222222222', current_date, 'B task', 30),
  ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'c0000000-0000-0000-0000-00000000000c', current_date, 'C task', 30);

create temp table results (n serial, test text, expected text, actual text);
grant insert, select on results to anon, authenticated;
grant usage on sequence results_n_seq to anon, authenticated;

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
    when check_violation then outcome := 'check';
    when others then outcome := 'error ' || sqlstate;
  end;
  insert into pg_temp.results (test, expected, actual) values (test, expected, outcome);
end $$;

create function pg_temp.exists_user(uid uuid) returns text language sql as
  $$ select case when exists (select 1 from auth.users where id = uid) then 'kept' else 'deleted' end $$;

-- Schema checks (as postgres) ----------------------------------------------------
select pg_temp.t('day_tasks has RLS enabled', 'rows=1',
  $q$select count(*) from pg_class where oid = 'public.day_tasks'::regclass and relrowsecurity$q$);
select pg_temp.t('day_tasks policies (select/insert/update/delete)', 'rows=4',
  $q$select count(*) from pg_policies where schemaname = 'public' and tablename = 'day_tasks'
     and cmd in ('SELECT','INSERT','UPDATE','DELETE') and roles = '{authenticated}'$q$);
select pg_temp.t('day_tasks indexes (user_id,day) and (goal_id)', 'rows=2',
  $q$select count(*) from pg_indexes where schemaname = 'public'
     and indexname in ('day_tasks_user_id_day_idx', 'day_tasks_goal_id_idx')$q$);
select pg_temp.t('profiles day_start/day_end not null with defaults 07:00/22:00', 'rows=2',
  $q$select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles'
     and is_nullable = 'NO'
     and ((column_name = 'day_start' and column_default like '''07:00:00''%')
       or (column_name = 'day_end' and column_default like '''22:00:00''%'))$q$);

-- anon -------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.t('anon select day_tasks', 'rows=0', 'select count(*) from public.day_tasks');
select pg_temp.t('anon insert task as A', 'denied',
  $q$insert into public.day_tasks (user_id, day, title, minutes) values ('11111111-1111-1111-1111-111111111111', current_date, 'x', 30)$q$);
select pg_temp.t('anon update A task', 'rows=0',
  $q$update public.day_tasks set done = true where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('anon delete A task', 'rows=0',
  $q$delete from public.day_tasks where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
reset role;

-- user A: own CRUD, cross-user goal refused, checks -----------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select pg_temp.t('A select all visible tasks (own only)', 'rows=1', 'select count(*) from public.day_tasks');
select pg_temp.t('A insert must task', 'rows=1',
  $q$insert into public.day_tasks (id, user_id, day, title, minutes, fixed_start) values ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', '11111111-1111-1111-1111-111111111111', current_date, 'Dentist', 45, '10:30')$q$);
select pg_temp.t('A insert goal task on own goal', 'rows=1',
  $q$insert into public.day_tasks (id, user_id, day, title, minutes, kind, goal_id) values ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', '11111111-1111-1111-1111-111111111111', current_date, 'Goal work', 60, 'goal', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$q$);
select pg_temp.t('A insert goal task on B goal', 'denied',
  $q$insert into public.day_tasks (user_id, day, title, minutes, kind, goal_id) values ('11111111-1111-1111-1111-111111111111', current_date, 'x', 60, 'goal', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$q$);
select pg_temp.t('A insert task owned by B', 'denied',
  $q$insert into public.day_tasks (user_id, day, title, minutes) values ('22222222-2222-2222-2222-222222222222', current_date, 'x', 30)$q$);
select pg_temp.t('A update own task', 'rows=1',
  $q$update public.day_tasks set title = 'A task edited', done = true, position = 2 where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('A repoint own goal task to B goal', 'denied',
  $q$update public.day_tasks set goal_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3'$q$);
select pg_temp.t('A turn own task into goal task on B goal', 'denied',
  $q$update public.day_tasks set kind = 'goal', goal_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('A hand own task to B', 'denied',
  $q$update public.day_tasks set user_id = '22222222-2222-2222-2222-222222222222' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('A select B tasks', 'rows=0',
  $q$select count(*) from public.day_tasks where user_id = '22222222-2222-2222-2222-222222222222'$q$);
select pg_temp.t('A update B task', 'rows=0',
  $q$update public.day_tasks set done = true where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'$q$);
select pg_temp.t('check: kind goal without goal_id', 'check',
  $q$insert into public.day_tasks (user_id, day, title, minutes, kind) values ('11111111-1111-1111-1111-111111111111', current_date, 'x', 30, 'goal')$q$);
select pg_temp.t('check: kind must with goal_id', 'check',
  $q$insert into public.day_tasks (user_id, day, title, minutes, kind, goal_id) values ('11111111-1111-1111-1111-111111111111', current_date, 'x', 30, 'must', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$q$);
select pg_temp.t('check: update goal task to kind nice keeping goal_id', 'check',
  $q$update public.day_tasks set kind = 'nice' where id = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3'$q$);
select pg_temp.t('check: unknown kind', 'check',
  $q$insert into public.day_tasks (user_id, day, title, minutes, kind) values ('11111111-1111-1111-1111-111111111111', current_date, 'x', 30, 'maybe')$q$);
select pg_temp.t('check: empty title', 'check',
  $q$insert into public.day_tasks (user_id, day, title, minutes) values ('11111111-1111-1111-1111-111111111111', current_date, '', 30)$q$);
select pg_temp.t('check: minutes below 5', 'check',
  $q$insert into public.day_tasks (user_id, day, title, minutes) values ('11111111-1111-1111-1111-111111111111', current_date, 'x', 4)$q$);
select pg_temp.t('check: minutes above 720', 'check',
  $q$insert into public.day_tasks (user_id, day, title, minutes) values ('11111111-1111-1111-1111-111111111111', current_date, 'x', 721)$q$);
select pg_temp.t('A delete own task', 'rows=1',
  $q$delete from public.day_tasks where id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'$q$);
-- profiles day window
select pg_temp.t('A insert profile with defaults only', 'rows=1',
  $q$insert into public.profiles (user_id) values ('11111111-1111-1111-1111-111111111111')$q$);
select pg_temp.t('A profile got 07:00 / 22:00', 'rows=1',
  $q$select count(*) from public.profiles where day_start = '07:00' and day_end = '22:00'$q$);
select pg_temp.t('check: day_end before day_start', 'check',
  $q$update public.profiles set day_start = '22:00', day_end = '06:00'$q$);
select pg_temp.t('check: day_end equal to day_start', 'check',
  $q$update public.profiles set day_start = '09:00', day_end = '09:00'$q$);
select pg_temp.t('A set valid day window', 'rows=1',
  $q$update public.profiles set day_start = '06:30', day_end = '21:00'$q$);
reset role;

-- user B (attacker) ----------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select pg_temp.t('B select all visible tasks (own only)', 'rows=1', 'select count(*) from public.day_tasks');
select pg_temp.t('B select A tasks', 'rows=0',
  $q$select count(*) from public.day_tasks where user_id = '11111111-1111-1111-1111-111111111111'$q$);
select pg_temp.t('B update A task', 'rows=0',
  $q$update public.day_tasks set title = 'changed' where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('B delete A task', 'rows=0',
  $q$delete from public.day_tasks where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
select pg_temp.t('B insert own task on A goal', 'denied',
  $q$insert into public.day_tasks (user_id, day, title, minutes, kind, goal_id) values ('22222222-2222-2222-2222-222222222222', current_date, 'x', 30, 'goal', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$q$);
select pg_temp.t('B insert task as A', 'denied',
  $q$insert into public.day_tasks (user_id, day, title, minutes) values ('11111111-1111-1111-1111-111111111111', current_date, 'x', 30)$q$);
select pg_temp.t('B repoint own task to A goal', 'denied',
  $q$update public.day_tasks set kind = 'goal', goal_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' where id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1'$q$);
select pg_temp.t('B update A profile', 'rows=0',
  $q$update public.profiles set day_end = '23:00' where user_id = '11111111-1111-1111-1111-111111111111'$q$);
reset role;

-- anonymous Supabase user C (authenticated role, is_anonymous) ----------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated","is_anonymous":true}';
select pg_temp.t('anonymous user C select all visible tasks (own only)', 'rows=1', 'select count(*) from public.day_tasks');
select pg_temp.t('anonymous user C update A task', 'rows=0',
  $q$update public.day_tasks set done = true where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'$q$);
reset role;

-- Cross-checks as postgres -------------------------------------------------------------------
select pg_temp.t('postgres: A task survived B attempts, A edit kept', 'rows=1',
  $q$select count(*) from public.day_tasks where id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' and title = 'A task edited' and done$q$);
select pg_temp.t('postgres: tasks pointing at another user''s goal', 'rows=0',
  'select count(*) from public.day_tasks d join public.goals g on g.id = d.goal_id where g.user_id <> d.user_id');
select pg_temp.t('postgres: deleting A goal cascades to its goal task', 'rows=1',
  $q$delete from public.goals where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$);
select pg_temp.t('postgres: A goal task gone after cascade', 'rows=0',
  $q$select count(*) from public.day_tasks where id = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3'$q$);

-- Cleanup function ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.t('anon execute cleanup function', 'denied', 'select private.delete_stale_anonymous_users()');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select pg_temp.t('authenticated execute cleanup function', 'denied', 'select private.delete_stale_anonymous_users()');
reset role;

insert into results (test, expected, actual) values
  ('cleanup: security definer, search_path empty', 'true',
     (select (p.prosecdef and p.proconfig @> array['search_path=""'])::text
        from pg_proc p where p.oid = 'private.delete_stale_anonymous_users()'::regprocedure)),
  ('cleanup: owner', 'postgres',
     (select pg_get_userbyid(p.proowner) from pg_proc p where p.oid = 'private.delete_stale_anonymous_users()'::regprocedure)),
  ('cleanup: anon/authenticated EXECUTE privilege', 'false',
     (has_function_privilege('anon', 'private.delete_stale_anonymous_users()', 'EXECUTE')
      or has_function_privilege('authenticated', 'private.delete_stale_anonymous_users()', 'EXECUTE'))::text),
  ('cleanup: day_tasks checked in both statements', '2',
     (select ((length(p.prosrc) - length(replace(p.prosrc, 'public.day_tasks', ''))) / length('public.day_tasks'))::text
        from pg_proc p where p.oid = 'private.delete_stale_anonymous_users()'::regprocedure)),
  ('cleanup: cron job unchanged', 'count=1 schedule=17 3 * * *',
     (select 'count=' || count(*) || ' schedule=' || coalesce(max(schedule), '-') from cron.job where jobname = 'cleanup-stale-anonymous-users'));

insert into results (test, expected, actual)
select 'cleanup: returned (deleted count)', (1 + (select n from pre))::text, private.delete_stale_anonymous_users()::text;

insert into results (test, expected, actual) values
  ('cleanup: (c) old anon, only day_tasks', 'kept',    pg_temp.exists_user('c0000000-0000-0000-0000-00000000000c')),
  ('cleanup: (c) day_tasks rows still present', '1',
     (select count(*)::text from public.day_tasks where user_id = 'c0000000-0000-0000-0000-00000000000c')),
  ('cleanup: (e) old anon, no data',       'deleted', pg_temp.exists_user('e0000000-0000-0000-0000-00000000000e')),
  ('cleanup: second run deletes nothing new', '0', private.delete_stale_anonymous_users()::text);

select test, expected, actual, case when expected = actual then 'PASS' else 'FAIL' end as result
from results order by n;

select count(*) filter (where expected = actual) as passed,
       count(*) filter (where expected is distinct from actual) as failed
from results;

do $$
declare p int; f int;
begin
  select count(*) filter (where expected = actual), count(*) filter (where expected is distinct from actual)
    into p, f from pg_temp.results;
  if f = 0 then raise notice 'day_planner_rls: PASS (% of % checks)', p, p + f;
  else raise notice 'day_planner_rls: FAIL (% passed, % failed)', p, f;
  end if;
end $$;

rollback;
