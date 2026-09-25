-- Fixes flagged by Supabase advisors after 0001_init:
--   security: functions had a mutable search_path
--   performance: RLS policies re-evaluated auth.<fn>() per row instead of
--     once per statement, and some tables had overlapping permissive
--     SELECT policies (a dedicated select policy plus a "for all" admin
--     policy that also covered select)

-- ---------------------------------------------------------------------------
-- Pin search_path on all SECURITY-relevant functions
-- ---------------------------------------------------------------------------

alter function reviews_reject_self_review() set search_path = public;
alter function reviews_sync_seller_rating() set search_path = public;
alter function set_updated_at() set search_path = public;
alter function is_admin() set search_path = public;
alter function is_verified_student() set search_path = public;

-- ---------------------------------------------------------------------------
-- profiles: wrap auth.uid() so it's evaluated once per statement, not per row
-- ---------------------------------------------------------------------------

drop policy "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = (select auth.uid()) or is_admin());

drop policy "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (id = (select auth.uid()));

drop policy "profiles_update_own_or_admin" on profiles;
create policy "profiles_update_own_or_admin" on profiles
  for update using (id = (select auth.uid()) or is_admin());

-- ---------------------------------------------------------------------------
-- campuses: split admin "for all" into non-select actions so it no longer
-- doubles up with campuses_select_public on SELECT
-- ---------------------------------------------------------------------------

drop policy "campuses_write_admin" on campuses;
create policy "campuses_insert_admin" on campuses
  for insert with check (is_admin());
create policy "campuses_update_admin" on campuses
  for update using (is_admin());
create policy "campuses_delete_admin" on campuses
  for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- categories: same split
-- ---------------------------------------------------------------------------

drop policy "categories_select_active_or_admin" on categories;
create policy "categories_select_active_or_admin" on categories
  for select using (is_active = true or is_admin());

drop policy "categories_write_admin" on categories;
create policy "categories_insert_admin" on categories
  for insert with check (is_admin());
create policy "categories_update_admin" on categories
  for update using (is_admin());
create policy "categories_delete_admin" on categories
  for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- sellers: rewrap auth.uid() (already split by action, no overlap issue)
-- ---------------------------------------------------------------------------

drop policy "sellers_select_approved_or_own_or_admin" on sellers;
create policy "sellers_select_approved_or_own_or_admin" on sellers
  for select using (
    status = 'approved' or owner_id = (select auth.uid()) or is_admin()
  );

drop policy "sellers_insert_own" on sellers;
create policy "sellers_insert_own" on sellers
  for insert with check (
    owner_id = (select auth.uid()) and is_verified_student()
  );

drop policy "sellers_update_own_or_admin" on sellers;
create policy "sellers_update_own_or_admin" on sellers
  for update using (owner_id = (select auth.uid()) or is_admin());

drop policy "sellers_delete_own_or_admin" on sellers;
create policy "sellers_delete_own_or_admin" on sellers
  for delete using (owner_id = (select auth.uid()) or is_admin());

-- ---------------------------------------------------------------------------
-- seller_categories: split write policy into insert/update/delete
-- ---------------------------------------------------------------------------

drop policy "seller_categories_select" on seller_categories;
create policy "seller_categories_select" on seller_categories
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = seller_categories.seller_id
        and (sellers.status = 'approved' or sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );

drop policy "seller_categories_write_owner_or_admin" on seller_categories;
create policy "seller_categories_insert_owner_or_admin" on seller_categories
  for insert with check (
    exists (
      select 1 from sellers
      where sellers.id = seller_categories.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );
create policy "seller_categories_update_owner_or_admin" on seller_categories
  for update using (
    exists (
      select 1 from sellers
      where sellers.id = seller_categories.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );
create policy "seller_categories_delete_owner_or_admin" on seller_categories
  for delete using (
    exists (
      select 1 from sellers
      where sellers.id = seller_categories.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- services: same split
-- ---------------------------------------------------------------------------

drop policy "services_select" on services;
create policy "services_select" on services
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = services.seller_id
        and (
          (sellers.status = 'approved' and services.is_active = true)
          or sellers.owner_id = (select auth.uid())
          or is_admin()
        )
    )
  );

drop policy "services_write_owner_or_admin" on services;
create policy "services_insert_owner_or_admin" on services
  for insert with check (
    exists (
      select 1 from sellers
      where sellers.id = services.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );
create policy "services_update_owner_or_admin" on services
  for update using (
    exists (
      select 1 from sellers
      where sellers.id = services.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );
create policy "services_delete_owner_or_admin" on services
  for delete using (
    exists (
      select 1 from sellers
      where sellers.id = services.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- seller_photos: same split
-- ---------------------------------------------------------------------------

drop policy "seller_photos_select" on seller_photos;
create policy "seller_photos_select" on seller_photos
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = seller_photos.seller_id
        and (sellers.status = 'approved' or sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );

drop policy "seller_photos_write_owner_or_admin" on seller_photos;
create policy "seller_photos_insert_owner_or_admin" on seller_photos
  for insert with check (
    exists (
      select 1 from sellers
      where sellers.id = seller_photos.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );
create policy "seller_photos_update_owner_or_admin" on seller_photos
  for update using (
    exists (
      select 1 from sellers
      where sellers.id = seller_photos.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );
create policy "seller_photos_delete_owner_or_admin" on seller_photos
  for delete using (
    exists (
      select 1 from sellers
      where sellers.id = seller_photos.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- reviews: rewrap auth.uid() (already split by action)
-- ---------------------------------------------------------------------------

drop policy "reviews_select" on reviews;
create policy "reviews_select" on reviews
  for select using (
    (
      is_hidden = false
      and exists (
        select 1 from sellers
        where sellers.id = reviews.seller_id and sellers.status = 'approved'
      )
    )
    or author_id = (select auth.uid())
    or is_admin()
  );

drop policy "reviews_insert_verified" on reviews;
create policy "reviews_insert_verified" on reviews
  for insert with check (
    author_id = (select auth.uid())
    and is_verified_student()
    and not exists (
      select 1 from sellers
      where sellers.id = reviews.seller_id and sellers.owner_id = (select auth.uid())
    )
  );

drop policy "reviews_update_own_or_admin" on reviews;
create policy "reviews_update_own_or_admin" on reviews
  for update using (author_id = (select auth.uid()) or is_admin());

drop policy "reviews_delete_own_or_admin" on reviews;
create policy "reviews_delete_own_or_admin" on reviews
  for delete using (author_id = (select auth.uid()) or is_admin());

-- ---------------------------------------------------------------------------
-- reports: rewrap auth.uid()
-- ---------------------------------------------------------------------------

drop policy "reports_select_own_or_admin" on reports;
create policy "reports_select_own_or_admin" on reports
  for select using (reporter_id = (select auth.uid()) or is_admin());

drop policy "reports_insert_own" on reports;
create policy "reports_insert_own" on reports
  for insert with check (reporter_id = (select auth.uid()));

drop policy "reports_update_admin" on reports;
create policy "reports_update_admin" on reports
  for update using (is_admin());

-- ---------------------------------------------------------------------------
-- seller_events: rewrap auth.uid() (insert policy uses `true`, no change needed)
-- ---------------------------------------------------------------------------

drop policy "seller_events_select_owner_or_admin" on seller_events;
create policy "seller_events_select_owner_or_admin" on seller_events
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = seller_events.seller_id
        and (sellers.owner_id = (select auth.uid()) or is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Missing FK-covering indexes flagged by the performance advisor
-- ---------------------------------------------------------------------------

create index reports_reporter_id_idx on reports (reporter_id);
create index reports_seller_id_idx on reports (seller_id);
create index reviews_author_id_idx on reviews (author_id);
create index seller_categories_category_id_idx on seller_categories (category_id);
create index sellers_campus_id_idx on sellers (campus_id);
