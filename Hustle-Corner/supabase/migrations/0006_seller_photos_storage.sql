-- Public bucket for seller portfolio photos. Public means anyone can read
-- a file via its public URL without auth (that's how seller_photos are
-- served on the site) — write access is still gated by RLS below.
insert into storage.buckets (id, name, public)
values ('seller-photos', 'seller-photos', true)
on conflict (id) do nothing;

-- Uploads live at `${seller_id}/filename`. A user may only write into the
-- folder for a seller row they own (or as admin) — the same ownership
-- rule as every other seller-owned table in this schema.
create policy "seller_photos_storage_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'seller-photos'
    and exists (
      select 1 from sellers
      where sellers.id::text = (storage.foldername(name))[1]
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );

create policy "seller_photos_storage_update" on storage.objects
  for update
  using (
    bucket_id = 'seller-photos'
    and exists (
      select 1 from sellers
      where sellers.id::text = (storage.foldername(name))[1]
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );

create policy "seller_photos_storage_delete" on storage.objects
  for delete
  using (
    bucket_id = 'seller-photos'
    and exists (
      select 1 from sellers
      where sellers.id::text = (storage.foldername(name))[1]
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );
