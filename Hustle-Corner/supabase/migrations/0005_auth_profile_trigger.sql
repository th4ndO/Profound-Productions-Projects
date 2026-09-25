-- Auto-create a public.profiles row whenever someone signs up via Supabase
-- Auth, so the app never has to remember to do it client-side.
--
-- is_verified is hardcoded to true here. The brief's real design is:
-- verified = email ends with an allowed campus domain (see
-- ALLOWED_EMAIL_DOMAINS in config.ts), which gates who can become a seller
-- or leave a review. That check is deliberately NOT implemented yet — it
-- was explicitly deferred to unblock Phase 4/5 while the correct UP
-- student domain is still unconfirmed.
--
-- TODO before real users touch this: replace `true` below with a check
-- against the allowed domain list, e.g.
--   right(new.email, ...) = any(array['tuks.co.za', ...])
-- As written, ANY email can become a seller or leave a review — that is
-- the app's core trust mechanism and it is currently a no-op.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    true
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Only the trigger above should ever call this (it reads the trigger-only
-- `new` pseudo-variable, so a direct RPC call would fail anyway) — but
-- PostgREST exposes every public-schema function by default, so revoke
-- that explicitly rather than rely on the call failing.
revoke all on function handle_new_user() from public, anon, authenticated;
