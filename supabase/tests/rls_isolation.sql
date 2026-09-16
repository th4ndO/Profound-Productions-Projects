-- RLS isolation proof: user B must never be able to read user A's goals.
--
-- Run against the project database (e.g. via the Supabase SQL editor, or
-- `supabase db execute -f supabase/tests/rls_isolation.sql` once linked).
-- Expects: user_b_sees_user_a_goal = 0, user_a_sees_own_goal = 1.
-- Verified manually against the live project on 2026-09-16 with this exact
-- script — see the Phase 1 report for the result.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'rls-test-a@example.invalid', '', now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'rls-test-b@example.invalid', '', now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

set local role postgres;
insert into goals (id, user_id, title, theme, timeframe)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'User A private goal', 'tree', 'week')
on conflict (id) do nothing;

-- Assert: authenticated as user B, cannot see user A's goal.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select (select count(*) from goals where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as user_b_sees_user_a_goal;

-- Assert: authenticated as user A, can see their own goal.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select (select count(*) from goals where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as user_a_sees_own_goal;

reset role;
delete from goals where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from auth.users where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');

rollback; -- test data was already cleaned up manually; rollback is a safety net if the script errors before cleanup runs.
