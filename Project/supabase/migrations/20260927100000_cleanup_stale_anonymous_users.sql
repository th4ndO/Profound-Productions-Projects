-- Daily cleanup of stale, empty anonymous accounts.
--
-- Why: Groundwork has no sign-in. Every visitor to /start gets a Supabase
-- anonymous user, so auth.users grows with every browser that looks and
-- leaves. This removes the ones that never saved anything.
--
-- Rule: an auth user is deleted only if ALL of these hold:
--   1. is_anonymous = true (non-anonymous users are never touched);
--   2. created_at < now() - interval '30 days';
--   3. they own no rows in public.goals, public.reminder_rules,
--      public.push_subscriptions or public.profiles. (milestones and tasks
--      hang off goals, so "no goals" covers them too.)
-- Users with ANY data are never deleted, however old: without sign-in
-- there is no way to recover an anonymous account, so its data would be lost.
--
-- Deleting from auth.users cascades to auth.identities, auth.sessions, etc.
-- (all on delete cascade / set null). The public tables also cascade, but by
-- rule 3 there is nothing in them to cascade.
--
-- Safety:
--   - private schema (no usage for anon/authenticated, not exposed by
--     PostgREST); execute revoked from public, anon, authenticated and not
--     granted to anyone else. Only postgres (the owner, which schedules the
--     cron job) can run it.
--   - security definer owned by postgres, search_path = '', fully qualified
--     names; it also refuses to run unless the session user is postgres or
--     supabase_admin, so a future accidental grant cannot expose it via the API.
--   - at most 1000 users per run, and rows locked by concurrent activity
--     (e.g. a goal being inserted right now) are skipped, not waited on.
--     Candidates are locked first, then re-checked in a second statement, so
--     a row saved at the same moment can't be lost to the cascade.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.delete_stale_anonymous_users()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_ids uuid[];
  deleted_count integer;
begin
  if session_user not in ('postgres', 'supabase_admin') then
    raise exception 'private.delete_stale_anonymous_users: not allowed for %', session_user
      using errcode = '42501';
  end if;

  -- Step 1: pick and lock up to 1000 candidates. FOR UPDATE blocks any new
  -- goals/profiles/... row referencing these users (FK checks need a KEY
  -- SHARE lock on the user row) until this transaction ends.
  select coalesce(pg_catalog.array_agg(c.id), '{}')
  into candidate_ids
  from (
    select u.id
    from auth.users u
    where u.is_anonymous = true
      and u.created_at < pg_catalog.now() - interval '30 days'
      and not exists (select 1 from public.goals g where g.user_id = u.id)
      and not exists (select 1 from public.reminder_rules r where r.user_id = u.id)
      and not exists (select 1 from public.push_subscriptions p where p.user_id = u.id)
      and not exists (select 1 from public.profiles pr where pr.user_id = u.id)
    order by u.created_at
    limit 1000
    for update of u skip locked
  ) c;

  -- Step 2: a new statement takes a fresh snapshot, so this re-check also sees
  -- anything committed just before the lock. Nothing new can appear after it,
  -- so the cascade can never remove a user's data.
  delete from auth.users u
  where u.id = any (candidate_ids)
    and u.is_anonymous = true
    and u.created_at < pg_catalog.now() - interval '30 days'
    and not exists (select 1 from public.goals g where g.user_id = u.id)
    and not exists (select 1 from public.reminder_rules r where r.user_id = u.id)
    and not exists (select 1 from public.push_subscriptions p where p.user_id = u.id)
    and not exists (select 1 from public.profiles pr where pr.user_id = u.id);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter function private.delete_stale_anonymous_users() owner to postgres;
revoke all on function private.delete_stale_anonymous_users() from public, anon, authenticated;

-- Daily at 03:17 UTC. Unschedule first so re-running this file is idempotent.
select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-stale-anonymous-users';

select cron.schedule(
  'cleanup-stale-anonymous-users',
  '17 3 * * *',
  $$select private.delete_stale_anonymous_users()$$
);
