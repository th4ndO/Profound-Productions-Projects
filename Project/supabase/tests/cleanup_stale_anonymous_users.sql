-- Tests for private.delete_stale_anonymous_users()
-- (migration 20260927100000_cleanup_stale_anonymous_users.sql).
--
-- One transaction, rolled back. Seeds six users, calls the function as
-- postgres, and checks which survive; then checks that anon and authenticated
-- cannot execute it. Output is one row per test: name, expected, actual, pass.
-- Counts and outcomes only, never row contents.
--
--   (a) old anonymous, no data            -> deleted
--   (b) old anonymous, has a goal         -> kept
--   (c) old anonymous, only a profile     -> kept
--   (d) old anonymous, only a push sub    -> kept
--   (e) recent anonymous, no data         -> kept
--   (f) old NON-anonymous, no data        -> kept
--
-- Run as the postgres role (psql -f, or the SQL editor on a branch).

begin;

-- Stale users already in the database (0 on a fresh branch) are also deleted
-- by the call, so the expected return value is 1 + this.
create temp table pre (n int);
insert into pre
select count(*) from auth.users u
where u.is_anonymous
  and u.created_at < now() - interval '30 days'
  and not exists (select 1 from public.goals g where g.user_id = u.id)
  and not exists (select 1 from public.reminder_rules r where r.user_id = u.id)
  and not exists (select 1 from public.push_subscriptions p where p.user_id = u.id)
  and not exists (select 1 from public.profiles pr where pr.user_id = u.id);

insert into auth.users (id, aud, role, email, is_anonymous, created_at) values
  ('a0000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', null, true,  now() - interval '60 days'),
  ('b0000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', null, true,  now() - interval '60 days'),
  ('c0000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', null, true,  now() - interval '60 days'),
  ('d0000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', null, true,  now() - interval '60 days'),
  ('e0000000-0000-0000-0000-00000000000e', 'authenticated', 'authenticated', null, true,  now() - interval '1 day'),
  ('f0000000-0000-0000-0000-00000000000f', 'authenticated', 'authenticated', 'cleanup-test-f@example.invalid', false, now() - interval '60 days');

insert into public.goals (user_id, title, theme)
  values ('b0000000-0000-0000-0000-00000000000b', 'kept goal', 'tree');
insert into public.profiles (user_id)
  values ('c0000000-0000-0000-0000-00000000000c');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('d0000000-0000-0000-0000-00000000000d', 'https://push.example.invalid/cleanup-test-d', 'k', 'a');

create temp table results (n serial, test text, expected text, actual text);
grant insert, select on results to anon, authenticated;
grant usage on sequence results_n_seq to anon, authenticated;

create function pg_temp.exists_user(uid uuid) returns text language sql as
  $$ select case when exists (select 1 from auth.users where id = uid) then 'kept' else 'deleted' end $$;

-- Runs the function as the current role and records the outcome.
create function pg_temp.try_exec(test text) returns void language plpgsql as $$
declare outcome text;
begin
  begin
    perform private.delete_stale_anonymous_users();
    outcome := 'executed';
  exception
    when insufficient_privilege then outcome := 'denied';
    when others then outcome := 'error ' || sqlstate;
  end;
  insert into pg_temp.results (test, expected, actual) values (test, 'denied', outcome);
end $$;

-- Privilege checks first, so a wrongly-granted call would show up as 'executed'.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.try_exec('anon execute function');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select pg_temp.try_exec('authenticated execute function');
reset role;

insert into results (test, expected, actual) values
  ('anon has EXECUTE privilege', 'false',
     has_function_privilege('anon', 'private.delete_stale_anonymous_users()', 'EXECUTE')::text),
  ('authenticated has EXECUTE privilege', 'false',
     has_function_privilege('authenticated', 'private.delete_stale_anonymous_users()', 'EXECUTE')::text),
  ('anon/authenticated usage on schema private', 'false',
     (has_schema_privilege('anon', 'private', 'USAGE') or has_schema_privilege('authenticated', 'private', 'USAGE'))::text),
  ('function is security definer, search_path empty', 'true',
     (select (p.prosecdef and p.proconfig @> array['search_path=""'])::text
        from pg_proc p where p.oid = 'private.delete_stale_anonymous_users()'::regprocedure)),
  ('function owner', 'postgres',
     (select pg_get_userbyid(p.proowner) from pg_proc p where p.oid = 'private.delete_stale_anonymous_users()'::regprocedure)),
  ('cron job cleanup-stale-anonymous-users', 'count=1 schedule=17 3 * * *',
     (select 'count=' || count(*) || ' schedule=' || coalesce(max(schedule), '-') from cron.job where jobname = 'cleanup-stale-anonymous-users'));

-- Call as postgres.
insert into results (test, expected, actual)
select 'function returned (deleted count)', (1 + (select n from pre))::text, private.delete_stale_anonymous_users()::text;

insert into results (test, expected, actual) values
  ('(a) old anon, no data',        'deleted', pg_temp.exists_user('a0000000-0000-0000-0000-00000000000a')),
  ('(b) old anon, has goal',       'kept',    pg_temp.exists_user('b0000000-0000-0000-0000-00000000000b')),
  ('(c) old anon, only profile',   'kept',    pg_temp.exists_user('c0000000-0000-0000-0000-00000000000c')),
  ('(d) old anon, only push sub',  'kept',    pg_temp.exists_user('d0000000-0000-0000-0000-00000000000d')),
  ('(e) recent anon, no data',     'kept',    pg_temp.exists_user('e0000000-0000-0000-0000-00000000000e')),
  ('(f) old non-anon, no data',    'kept',    pg_temp.exists_user('f0000000-0000-0000-0000-00000000000f')),
  ('(b) goal rows still present',  '1',
     (select count(*)::text from public.goals where user_id = 'b0000000-0000-0000-0000-00000000000b')),
  ('second run deletes nothing new', '0', private.delete_stale_anonymous_users()::text);

select test, expected, actual, case when expected = actual then 'PASS' else 'FAIL' end as result
from results order by n;

select count(*) filter (where expected = actual) as passed,
       count(*) filter (where expected <> actual) as failed
from results;

rollback;
