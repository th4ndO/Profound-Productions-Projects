-- storage.objects (seller-photos bucket) had INSERT/UPDATE/DELETE policies
-- but no SELECT policy. The public bucket flag lets anyone read a file via
-- its public URL without RLS (that's how seller_photos display on the
-- site), which is why this went unnoticed -- but the authenticated
-- Storage management API (delete/update/list) still needs a SELECT policy
-- to see the row at all. Without one, an owner's delete silently no-ops on
-- the bulk `prefixes` endpoint (200 OK, empty result) or 403s on the
-- single-object endpoint, even though the DELETE/UPDATE policies' own
-- USING clauses are correct -- the row is invisible to begin with.
--
-- Found while testing account deletion end-to-end: the DB rows cascaded
-- correctly but the actual photo file was left behind in storage. This
-- same bug has been present since the bucket was created (0006/0007) and
-- likely means every "successful" photo delete via the dashboard
-- (deletePhoto in app/dashboard/actions.ts) has silently left the actual
-- file in storage while only removing its DB row. Confirmed and cleaned up
-- two such orphaned objects from earlier testing.
create policy "seller_photos_storage_select" on storage.objects
  for select
  using (
    bucket_id = 'seller-photos'
    and exists (
      select 1 from sellers
      where sellers.id::text = (storage.foldername(name))[1]
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );
