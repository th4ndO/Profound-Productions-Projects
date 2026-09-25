-- finance-readonly-role.sql
-- Read-only role for finance-reporter on Coco Bliss PRODUCTION (xvpdqldlqbtafcbycwxp, RED).
--
-- STATUS: NOT RUN. Review every line before running. Nothing in this repo runs it.
--
-- How finance-reporter uses it: every query is wrapped as
--     begin; set local role finance_readonly; select ...; rollback;
-- so it runs with ONLY the privileges granted below, even though the Supabase
-- connection itself is privileged. A hook refuses finance queries that skip this.
--
-- Design choices:
--   * NOLOGIN: nobody can connect as this role directly; it is only "worn" via SET ROLE.
--   * Column-level SELECT grants: finance needs amounts, dates, products, and channel,
--     not customer names, emails, phones, or addresses. Leave personal columns out.
--   * RLS: tables with row level security return ZERO rows to a role with no policy,
--     which would silently turn revenue into R0. Step 3 adds read-only SELECT policies
--     for this role only. (Alternative: BYPASSRLS — broader, and may need superuser;
--     not recommended.)
--
-- Run in the Supabase dashboard SQL editor (as postgres), one step at a time.

-- ===========================================================================
-- STEP 1 — DISCOVER (read-only). Run this first and use the output to fill in STEP 3.
-- ===========================================================================
select c.table_name, c.column_name, c.data_type,
       t.rls_enabled
from information_schema.columns c
join (select relname as table_name, relrowsecurity as rls_enabled
        from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r','p','v','m')) t
  using (table_name)
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;

-- ===========================================================================
-- STEP 2 — CREATE THE ROLE
-- ===========================================================================
begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'finance_readonly') then
    create role finance_readonly nologin noinherit;
  end if;
end $$;

-- Let the connection role used by the Supabase MCP / SQL editor switch into it.
grant finance_readonly to postgres;

-- Start from nothing, then grant only what's needed.
revoke all on all tables in schema public from finance_readonly;
revoke all on schema public from finance_readonly;
grant usage on schema public to finance_readonly;

-- Note: "alter role ... set statement_timeout" would NOT apply here. Role settings only
-- take effect at login, and this role is entered with SET ROLE. finance-reporter's
-- queries can add "set local statement_timeout = '30s';" after the role switch if needed.

commit;

-- ===========================================================================
-- STEP 3 — GRANT READ ACCESS TO FINANCE COLUMNS ONLY  [CONFIRM every table/column]
-- The names below are PLACEHOLDERS. Replace them with the real ones from STEP 1,
-- delete any line whose table doesn't exist, and never add personal-data columns.
-- ===========================================================================
begin;

-- Orders: amounts, status, dates, and (if it exists) the sales channel.
grant select (id, status, total_cents, created_at, paid_at /*, channel */) on public.orders to finance_readonly;          -- [CONFIRM]

-- Order lines: which product, how many, at what price.
grant select (order_id, product_id, quantity, unit_price_cents) on public.order_items to finance_readonly;                -- [CONFIRM]

-- Products: name and cost (cost is needed for margin; if there is no cost column, margin is a data gap).
grant select (id, name /*, cost_cents */) on public.products to finance_readonly;                                        -- [CONFIRM]

-- RLS: only for tables where STEP 1 showed rls_enabled = true. Read-only, this role only.
create policy finance_readonly_select on public.orders      for select to finance_readonly using (true);                -- [CONFIRM]
create policy finance_readonly_select on public.order_items for select to finance_readonly using (true);                -- [CONFIRM]
create policy finance_readonly_select on public.products    for select to finance_readonly using (true);                -- [CONFIRM]

commit;

-- ===========================================================================
-- STEP 4 — VERIFY (read-only). Expected results in the comments.
-- ===========================================================================
begin;
set local role finance_readonly;
select current_user;                                        -- finance_readonly
select count(*) from public.orders;                         -- same as the count you see as postgres (not 0)
rollback;

begin;
set local role finance_readonly;
update public.orders set status = status where false;       -- MUST fail: permission denied
rollback;

begin;
set local role finance_readonly;
select * from public.orders limit 1;                        -- MUST fail if any personal column exists (column not granted)
rollback;

-- ===========================================================================
-- ROLLBACK (removes everything this file created)
-- ===========================================================================
-- begin;
-- drop policy if exists finance_readonly_select on public.orders;
-- drop policy if exists finance_readonly_select on public.order_items;
-- drop policy if exists finance_readonly_select on public.products;
-- revoke all on all tables in schema public from finance_readonly;
-- revoke usage on schema public from finance_readonly;
-- revoke finance_readonly from postgres;
-- drop role if exists finance_readonly;
-- commit;
