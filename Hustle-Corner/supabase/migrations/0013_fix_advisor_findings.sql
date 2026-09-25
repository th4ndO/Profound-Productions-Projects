-- 0011's `create or replace function sellers_protect_privileged_columns()`
-- redefined the function without repeating `set search_path = public` from
-- 0009 -- CREATE OR REPLACE resets proconfig to whatever the new statement
-- specifies, so this silently wiped the search_path pin, leaving the
-- function vulnerable to search_path hijacking of its is_admin() call.
alter function sellers_protect_privileged_columns() set search_path = public;

-- anon retained an EXECUTE grant on both narrow party-name lookup RPCs
-- despite `revoke all ... from public` in their migrations (0003/0004,
-- 0012) -- not currently exploitable, since both gate on auth.uid()
-- matching a real relationship and return zero rows for anon, but there's
-- no reason for these to be anon-callable at all.
revoke execute on function get_appointment_party_names(uuid[]) from anon;
revoke execute on function get_review_author_names(uuid[]) from anon;
