-- CampusHustle initial schema
-- Run via the Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  is_verified boolean not null default false,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table sellers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references profiles (id) on delete cascade,
  campus_id uuid not null references campuses (id),
  business_name text not null,
  slug text not null unique,
  bio text check (char_length(bio) <= 500),
  whatsapp_number text not null,
  instagram_handle text,
  area_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  plan text not null default 'free',
  avg_rating numeric not null default 0,
  review_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table seller_categories (
  seller_id uuid not null references sellers (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  primary key (seller_id, category_id)
);

create table services (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  name text not null,
  price_from int not null check (price_from >= 0),
  price_to int check (price_to is null or price_to >= price_from),
  duration_minutes int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table seller_photos (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (seller_id, author_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create table seller_events (
  id bigserial primary key,
  seller_id uuid not null references sellers (id) on delete cascade,
  event_type text not null check (event_type in ('profile_view', 'whatsapp_click')),
  created_at timestamptz not null default now()
);

create index services_seller_id_idx on services (seller_id);
create index seller_photos_seller_id_idx on seller_photos (seller_id);
create index reviews_seller_id_idx on reviews (seller_id);
create index seller_events_seller_id_idx on seller_events (seller_id);
create index sellers_status_idx on sellers (status);

-- ---------------------------------------------------------------------------
-- Reviews cannot target the reviewer's own seller profile
-- ---------------------------------------------------------------------------

create or replace function reviews_reject_self_review()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from sellers
    where sellers.id = new.seller_id
      and sellers.owner_id = new.author_id
  ) then
    raise exception 'Cannot review your own seller profile';
  end if;
  return new;
end;
$$;

create trigger reviews_reject_self_review_trigger
  before insert or update on reviews
  for each row execute function reviews_reject_self_review();

-- ---------------------------------------------------------------------------
-- Keep sellers.avg_rating / review_count in sync with non-hidden reviews
-- ---------------------------------------------------------------------------

create or replace function reviews_sync_seller_rating()
returns trigger
language plpgsql
as $$
declare
  target_seller_id uuid;
begin
  target_seller_id := coalesce(new.seller_id, old.seller_id);

  update sellers
  set
    avg_rating = coalesce((
      select round(avg(rating)::numeric, 2)
      from reviews
      where seller_id = target_seller_id and is_hidden = false
    ), 0),
    review_count = (
      select count(*)
      from reviews
      where seller_id = target_seller_id and is_hidden = false
    )
  where id = target_seller_id;

  return null;
end;
$$;

create trigger reviews_sync_seller_rating_trigger
  after insert or update or delete on reviews
  for each row execute function reviews_sync_seller_rating();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger sellers_set_updated_at
  before update on sellers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table campuses enable row level security;
alter table categories enable row level security;
alter table sellers enable row level security;
alter table seller_categories enable row level security;
alter table services enable row level security;
alter table seller_photos enable row level security;
alter table reviews enable row level security;
alter table reports enable row level security;
alter table seller_events enable row level security;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_verified_student()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and is_verified = true
  );
$$;

-- profiles: users manage their own row; admins manage all
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own_or_admin" on profiles
  for update using (id = auth.uid() or is_admin());

-- campuses: public read; admin write
create policy "campuses_select_public" on campuses
  for select using (true);
create policy "campuses_write_admin" on campuses
  for all using (is_admin()) with check (is_admin());

-- categories: public read active ones (admins see + manage all)
create policy "categories_select_active_or_admin" on categories
  for select using (is_active = true or is_admin());
create policy "categories_write_admin" on categories
  for all using (is_admin()) with check (is_admin());

-- sellers: public read approved; owner manages own; admin manages all
create policy "sellers_select_approved_or_own_or_admin" on sellers
  for select using (status = 'approved' or owner_id = auth.uid() or is_admin());
create policy "sellers_insert_own" on sellers
  for insert with check (owner_id = auth.uid() and is_verified_student());
create policy "sellers_update_own_or_admin" on sellers
  for update using (owner_id = auth.uid() or is_admin());
create policy "sellers_delete_own_or_admin" on sellers
  for delete using (owner_id = auth.uid() or is_admin());

-- seller_categories: readable alongside an approved (or own) seller; owner/admin write
create policy "seller_categories_select" on seller_categories
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = seller_categories.seller_id
        and (sellers.status = 'approved' or sellers.owner_id = auth.uid() or is_admin())
    )
  );
create policy "seller_categories_write_owner_or_admin" on seller_categories
  for all using (
    exists (
      select 1 from sellers
      where sellers.id = seller_categories.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  ) with check (
    exists (
      select 1 from sellers
      where sellers.id = seller_categories.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  );

-- services: public read active services of approved sellers; owner/admin write
create policy "services_select" on services
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = services.seller_id
        and (
          (sellers.status = 'approved' and services.is_active = true)
          or sellers.owner_id = auth.uid()
          or is_admin()
        )
    )
  );
create policy "services_write_owner_or_admin" on services
  for all using (
    exists (
      select 1 from sellers
      where sellers.id = services.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  ) with check (
    exists (
      select 1 from sellers
      where sellers.id = services.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  );

-- seller_photos: public read for approved sellers; owner/admin write
create policy "seller_photos_select" on seller_photos
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = seller_photos.seller_id
        and (sellers.status = 'approved' or sellers.owner_id = auth.uid() or is_admin())
    )
  );
create policy "seller_photos_write_owner_or_admin" on seller_photos
  for all using (
    exists (
      select 1 from sellers
      where sellers.id = seller_photos.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  ) with check (
    exists (
      select 1 from sellers
      where sellers.id = seller_photos.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  );

-- reviews: public read non-hidden reviews of approved sellers (+ own/admin);
-- verified students insert one review per seller, never on their own seller
create policy "reviews_select" on reviews
  for select using (
    (
      is_hidden = false
      and exists (
        select 1 from sellers
        where sellers.id = reviews.seller_id and sellers.status = 'approved'
      )
    )
    or author_id = auth.uid()
    or is_admin()
  );
create policy "reviews_insert_verified" on reviews
  for insert with check (
    author_id = auth.uid()
    and is_verified_student()
    and not exists (
      select 1 from sellers
      where sellers.id = reviews.seller_id and sellers.owner_id = auth.uid()
    )
  );
create policy "reviews_update_own_or_admin" on reviews
  for update using (author_id = auth.uid() or is_admin());
create policy "reviews_delete_own_or_admin" on reviews
  for delete using (author_id = auth.uid() or is_admin());

-- reports: reporter can insert and see their own; admin sees/manages all
create policy "reports_select_own_or_admin" on reports
  for select using (reporter_id = auth.uid() or is_admin());
create policy "reports_insert_own" on reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_update_admin" on reports
  for update using (is_admin());

-- seller_events: public insert (rate-limited at the API route level);
-- select only by the seller owner and admins
create policy "seller_events_insert_public" on seller_events
  for insert with check (true);
create policy "seller_events_select_owner_or_admin" on seller_events
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = seller_events.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  );
