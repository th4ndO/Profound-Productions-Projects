-- Phase 5 (Web Push reminders): scheduling + secret-reading infrastructure.
-- The VAPID key pair itself is stored via `select vault.create_secret(...)`
-- (names 'vapid_private_key' / 'vapid_public_key'), not by a migration —
-- migrations are readable by anyone with repo access, secrets are not.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Restricted schema for helper functions that must not be reachable by
-- anon/authenticated roles via PostgREST (only service_role/postgres).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- Not currently called by the send-reminders Edge Function (it reads
-- vault.decrypted_secrets directly over SUPABASE_DB_URL instead, since
-- PostgREST only exposes the public schema), but kept as the
-- narrowly-scoped, service-role-only way to read a Vault secret from SQL
-- if that's ever needed from a trigger or another function.
create or replace function private.vault_read_secret(secret_name text)
returns text
language sql
security definer
set search_path = vault, pg_catalog
as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;

revoke all on function private.vault_read_secret(text) from public, anon, authenticated;
grant execute on function private.vault_read_secret(text) to service_role;
