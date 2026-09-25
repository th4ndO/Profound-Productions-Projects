-- profiles_update_own_or_admin and sellers_update_own_or_admin only ever
-- had a USING clause, no WITH CHECK. Postgres reuses USING as the implicit
-- WITH CHECK when one isn't given, and that USING clause only restricts
-- *which row* can be touched (id = auth.uid() / owner_id = auth.uid()) --
-- it says nothing about which *columns* change. Since neither policy's
-- check depends on new column values, any authenticated user could call
-- `.update()` directly (bypassing the UI entirely, which never exposes
-- these fields) and:
--   - set their own profiles.role to 'admin' -- full site-wide admin access
--   - set their own sellers.status to 'approved' -- skip moderation
--     entirely, or fake avg_rating/review_count
--
-- Neither is visible from the app's UI or from a quick read of the RLS
-- policies "looking correct" -- same class of silent gap as the two bugs
-- already documented in 0007/0008 and RLS_TESTING.md, just on the write
-- side instead of a missing policy. Fixed with BEFORE UPDATE triggers
-- (RLS's WITH CHECK can't easily compare against the OLD row without a
-- self-referential subquery, which is fragile under RLS recursion).

create or replace function profiles_protect_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if not is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change a profile''s role.';
    end if;
    if new.is_verified is distinct from old.is_verified then
      raise exception 'Only an admin can change a profile''s verified status.';
    end if;
  end if;
  return new;
end;
$$;

alter function profiles_protect_privileged_columns() set search_path = public;
revoke all on function profiles_protect_privileged_columns() from public, anon, authenticated;

create trigger profiles_protect_privileged_columns_trigger
  before update on profiles
  for each row execute function profiles_protect_privileged_columns();

-- sellers.avg_rating/review_count are legitimately written by
-- reviews_sync_seller_rating (0007) as a side effect of a review
-- insert/update/delete -- that happens as a nested UPDATE fired from
-- inside the reviews trigger, so pg_trigger_depth() is > 1 there. A
-- direct client-side `.update()` on sellers is always a top-level
-- statement (depth = 1), so this distinguishes "the system updated your
-- rating because of a review" from "you set your own rating directly."
create or replace function sellers_protect_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if not is_admin() then
    if new.status is distinct from old.status then
      raise exception 'Only an admin can change a seller''s status.';
    end if;
    if new.avg_rating is distinct from old.avg_rating
       or new.review_count is distinct from old.review_count then
      raise exception 'avg_rating/review_count cannot be set directly.';
    end if;
  end if;

  return new;
end;
$$;

alter function sellers_protect_privileged_columns() set search_path = public;
revoke all on function sellers_protect_privileged_columns() from public, anon, authenticated;

create trigger sellers_protect_privileged_columns_trigger
  before update on sellers
  for each row execute function sellers_protect_privileged_columns();
