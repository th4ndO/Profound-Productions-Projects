-- Same gap as 0009, found by applying the same reasoning to the remaining
-- owner-scoped UPDATE policy: reviews_update_own_or_admin (0001) only has a
-- USING clause (author_id = auth.uid() or is_admin()), so its implicit
-- WITH CHECK is that same expression evaluated on the NEW row. Since an
-- update never changes author_id, the check passes trivially regardless of
-- what else changes. Two real ways this bypasses moderation/authenticity:
--
--   - A review's own author can flip is_hidden back to false after an
--     admin hides it for violating policy -- silently undoing moderation.
--   - A review's own author can repoint seller_id at a *different*
--     approved seller (reviews_reject_self_review only blocks pointing it
--     at their OWN seller, still fires on UPDATE, but says nothing about
--     other sellers) -- effectively transplanting a review's rating/
--     comment onto a seller who never earned it, and leaving the
--     original seller's avg_rating/review_count stale (reviews_sync_seller_rating
--     only recomputes the new seller_id on an UPDATE, never the old one).
--
-- Neither is reachable from the app's UI (there's no "edit review" flow --
-- only insert-once and delete-own), so this was invisible in normal use.
-- rating/comment are left editable by the author; only the
-- moderation/identity columns are locked down.

create or replace function reviews_protect_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if not is_admin() then
    if new.is_hidden is distinct from old.is_hidden then
      raise exception 'Only an admin can hide or unhide a review.';
    end if;
    if new.seller_id is distinct from old.seller_id then
      raise exception 'A review cannot be moved to a different seller.';
    end if;
    if new.author_id is distinct from old.author_id then
      raise exception 'A review cannot be reassigned to a different author.';
    end if;
  end if;
  return new;
end;
$$;

alter function reviews_protect_privileged_columns() set search_path = public;
revoke all on function reviews_protect_privileged_columns() from public, anon, authenticated;

create trigger reviews_protect_privileged_columns_trigger
  before update on reviews
  for each row execute function reviews_protect_privileged_columns();
