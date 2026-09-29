-- Daily planner: a working-day window on profiles, a day_tasks table, and
-- the stale-anonymous cleanup taught about day_tasks.
--
-- Owner decision (2026-09-29): build the daily planner and store plans in the
-- account.
--
-- 1. profiles.day_start / day_end: the part of the day the planner schedules
--    into. Constant defaults, so existing rows get 07:00 / 22:00 without a
--    table rewrite. day_end must be after day_start (no overnight windows).
--
-- 2. day_tasks: one row per planned task on a given day.
--    - fixed_start is set for an appointment at a fixed time; null means the
--      app places the task itself.
--    - kind 'goal' tasks point at one of the user's goals; other kinds have
--      no goal. The check keeps kind and goal_id consistent. Deleting the
--      goal deletes its planner tasks (a 'goal' task without a goal would
--      break that check, so set null is not an option).
--
-- 3. RLS on day_tasks: direct ownership (user_id = auth.uid()), auth.uid()
--    wrapped in (select ...) so it is evaluated once per statement (advisor
--    lint 0003_auth_rls_initplan). INSERT and UPDATE also require goal_id to
--    be null or one of the caller's own goals: the same rule reminder_rules
--    got in 20260927090000, applied from the start here. SELECT, DELETE and
--    UPDATE's USING stay on user_id alone, for the reasons given there.
--    Policies apply to the authenticated role only (anonymous Supabase users
--    also have that role); anon has no auth.uid() and never matched anyway.
--    No extra grants: the table keeps the usual Supabase default privileges.
--
-- 4. private.delete_stale_anonymous_users(): identical to 20260927100000
--    except that a user who owns day_tasks rows is no longer a candidate
--    (both in the candidate select and in the re-checked delete). Without
--    this, an anonymous user whose only data is planner tasks would be
--    deleted and the tasks would cascade away with them. Security definer,
--    search_path = '', the session_user guard, owner, revokes, the 1000 per
--    run limit and skip locked are unchanged. The cron schedule is untouched.

-- 1. profiles: planner day window ---------------------------------------------

alter table public.profiles
  add column day_start time not null default '07:00',
  add column day_end time not null default '22:00',
  add constraint profiles_day_window_check check (day_end > day_start);

-- 2. day_tasks -----------------------------------------------------------------

create table public.day_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  title text not null check (char_length(title) between 1 and 100),
  minutes int not null check (minutes between 5 and 720),
  fixed_start time,
  kind text not null default 'must' check (kind in ('must', 'nice', 'goal')),
  goal_id uuid references public.goals(id) on delete cascade,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint day_tasks_goal_kind_check check ((kind = 'goal') = (goal_id is not null))
);

create index day_tasks_user_id_day_idx on public.day_tasks(user_id, day);
create index day_tasks_goal_id_idx on public.day_tasks(goal_id);

-- 3. RLS -------------------------------------------------------------------------

alter table public.day_tasks enable row level security;

create policy day_tasks_select on public.day_tasks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy day_tasks_insert on public.day_tasks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      goal_id is null
      or exists (
        select 1 from public.goals
        where goals.id = day_tasks.goal_id
          and goals.user_id = (select auth.uid())
      )
    )
  );

create policy day_tasks_update on public.day_tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      goal_id is null
      or exists (
        select 1 from public.goals
        where goals.id = day_tasks.goal_id
          and goals.user_id = (select auth.uid())
      )
    )
  );

create policy day_tasks_delete on public.day_tasks
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 4. Stale-anonymous cleanup also keeps users who own day_tasks ------------------

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
      and not exists (select 1 from public.day_tasks d where d.user_id = u.id)
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
    and not exists (select 1 from public.profiles pr where pr.user_id = u.id)
    and not exists (select 1 from public.day_tasks d where d.user_id = u.id);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter function private.delete_stale_anonymous_users() owner to postgres;
revoke all on function private.delete_stale_anonymous_users() from public, anon, authenticated;
