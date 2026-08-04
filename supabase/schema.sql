-- Run this once in your Supabase project's SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new

-- 1. PROJECTS TABLE
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (
    category in ('graphic_design', 'photography', 'website_work')
  ),
  subcategory text check (
    subcategory in ('logo', 'business_card', 'poster', 'flyer', 'other')
  ),
  client_name text,
  image_url text not null,
  website_url text,
  display_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on every edit
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 2. ROW LEVEL SECURITY
-- Public visitors can only ever READ published projects.
-- Only an authenticated user (you, via /admin) can insert/update/delete.
alter table public.projects enable row level security;

drop policy if exists "Public can view published projects" on public.projects;
create policy "Public can view published projects"
  on public.projects for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "Authenticated can view all projects" on public.projects;
create policy "Authenticated can view all projects"
  on public.projects for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can insert projects" on public.projects;
create policy "Authenticated can insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated can update projects" on public.projects;
create policy "Authenticated can update projects"
  on public.projects for update
  to authenticated
  using (true);

drop policy if exists "Authenticated can delete projects" on public.projects;
create policy "Authenticated can delete projects"
  on public.projects for delete
  to authenticated
  using (true);

-- 3. STORAGE BUCKET FOR PROJECT IMAGES
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view project images" on storage.objects;
create policy "Public can view project images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-images');

drop policy if exists "Authenticated can upload project images" on storage.objects;
create policy "Authenticated can upload project images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images');

drop policy if exists "Authenticated can update project images" on storage.objects;
create policy "Authenticated can update project images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images');

drop policy if exists "Authenticated can delete project images" on storage.objects;
create policy "Authenticated can delete project images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images');
