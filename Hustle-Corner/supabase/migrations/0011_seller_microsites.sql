-- Cheapest possible version of a paid "micro-site" package: no new routes,
-- no subdomains, no new hosting -- just a few optional columns on sellers
-- that /s/[slug] renders extra content from when has_microsite is true.
-- has_microsite itself is admin-only (same privileged-column pattern as
-- status in 0009): a seller must never be able to flip on a paid feature
-- for themselves via a direct .update() call.

alter table sellers
  add column has_microsite boolean not null default false,
  add column microsite_tagline text,
  add column microsite_theme_color text,
  add column microsite_story text;

alter table sellers
  add constraint microsite_theme_color_format
  check (microsite_theme_color is null or microsite_theme_color ~ '^#[0-9a-fA-F]{6}$');

-- Extend the existing privileged-column guard (0009) to also cover
-- has_microsite. tagline/theme_color/story stay owner-editable (like bio) --
-- only the on/off switch for the paid feature itself needs locking down.
create or replace function sellers_protect_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if not is_admin() then
    if new.status is distinct from old.status then
      raise exception 'Only an admin can change a seller''s status.';
    end if;
    if new.avg_rating is distinct from old.avg_rating
       or new.review_count is distinct from old.review_count then
      raise exception 'avg_rating/review_count cannot be set directly.';
    end if;
    if new.has_microsite is distinct from old.has_microsite then
      raise exception 'Only an admin can enable or disable the micro-site package.';
    end if;
  end if;

  return new;
end;
$$;
