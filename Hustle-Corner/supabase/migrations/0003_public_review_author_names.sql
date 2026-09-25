-- Seller profile pages need to show a reviewer's display name next to their
-- review. profiles RLS intentionally restricts SELECT to "own row or admin"
-- (it holds email, an unlisted field), so a plain public join would either
-- return nothing or, if that policy were loosened to make it work, leak
-- every column of the row (including email) to anyone.
--
-- This SECURITY DEFINER function bypasses that RLS deliberately, but stays
-- narrow: it only returns id + full_name, and only for authors of a review
-- a visitor is already allowed to see (non-hidden, on an approved seller) —
-- the same visibility rule as the reviews_select RLS policy. search_path is
-- pinned and EXECUTE is explicitly granted only to anon/authenticated (the
-- two roles that are meant to call it), matching how the rest of this
-- schema's functions are hardened.

create or replace function get_review_author_names(profile_ids uuid[])
returns table(id uuid, full_name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name
  from profiles p
  where p.id = any(profile_ids)
    and exists (
      select 1 from reviews r
      join sellers s on s.id = r.seller_id
      where r.author_id = p.id
        and r.is_hidden = false
        and s.status = 'approved'
    );
$$;

revoke all on function get_review_author_names(uuid[]) from public;
grant execute on function get_review_author_names(uuid[]) to anon, authenticated;
