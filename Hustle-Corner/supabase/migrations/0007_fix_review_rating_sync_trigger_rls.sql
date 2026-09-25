-- reviews_sync_seller_rating (0001, search_path pinned in 0002) updates
-- the sellers row from a trigger fired by the review's author, who is
-- almost never the seller's owner. Running as SECURITY INVOKER meant its
-- internal UPDATE was silently blocked by sellers' own-row-only RLS —
-- 0 rows affected, no error — so avg_rating/review_count never actually
-- updated after a review. Found by actually submitting a real review
-- end-to-end rather than trusting the migration alone.
alter function reviews_sync_seller_rating() security definer;

-- Same lockdown as handle_new_user (0005): this is trigger-only and
-- PostgREST exposes every public-schema function by default.
revoke all on function reviews_sync_seller_rating() from public, anon, authenticated;
