-- Booking / appointments. Sellers define a recurring weekly availability
-- template (day of week + time window + slot length); actual open slots
-- are computed on read (app layer) from that template minus existing
-- pending/confirmed appointments -- there's no "slot generation" job, no
-- cron, nothing to keep in sync. A buyer requests a specific slot, the
-- seller confirms or declines it. No payment changes hands through the
-- app; this is scheduling coordination, same trust model as everything
-- else here (WhatsApp is still where the actual conversation happens).

create table seller_availability_rules (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  slot_minutes int not null default 30 check (slot_minutes > 0 and slot_minutes <= 480),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index seller_availability_rules_seller_id_idx on seller_availability_rules (seller_id);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  buyer_id uuid not null references profiles (id) on delete cascade,
  service_id uuid references services (id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index appointments_seller_id_idx on appointments (seller_id);
create index appointments_buyer_id_idx on appointments (buyer_id);

-- The actual no-double-booking guarantee: only one pending or confirmed
-- appointment can occupy a given (seller, start time). A declined or
-- cancelled row doesn't count, so the slot frees back up. This is a real
-- constraint the database enforces atomically -- two buyers racing to
-- book the same slot can't both succeed, unlike an app-level
-- check-then-insert which has a race window.
create unique index appointments_no_double_booking
  on appointments (seller_id, start_at)
  where status in ('pending', 'confirmed');

create trigger appointments_set_updated_at
  before update on appointments
  for each row execute function set_updated_at();

-- Same pattern as reviews_reject_self_review (0001): a seller can't book
-- an appointment slot with themselves.
create or replace function appointments_reject_self_booking()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from sellers
    where sellers.id = new.seller_id and sellers.owner_id = new.buyer_id
  ) then
    raise exception 'Cannot book an appointment with your own seller profile';
  end if;
  return new;
end;
$$;

alter function appointments_reject_self_booking() set search_path = public;

create trigger appointments_reject_self_booking_trigger
  before insert on appointments
  for each row execute function appointments_reject_self_booking();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table seller_availability_rules enable row level security;
alter table appointments enable row level security;

-- availability rules: public read (needed to compute open slots for an
-- approved seller); owner/admin write
create policy "availability_rules_select" on seller_availability_rules
  for select using (
    exists (
      select 1 from sellers
      where sellers.id = seller_availability_rules.seller_id
        and (sellers.status = 'approved' or sellers.owner_id = auth.uid() or is_admin())
    )
  );
create policy "availability_rules_write_owner_or_admin" on seller_availability_rules
  for all using (
    exists (
      select 1 from sellers
      where sellers.id = seller_availability_rules.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  ) with check (
    exists (
      select 1 from sellers
      where sellers.id = seller_availability_rules.seller_id
        and (sellers.owner_id = auth.uid() or is_admin())
    )
  );

-- appointments: the buyer who booked it, the seller it's booked with, or
-- an admin can see it. Nobody else.
create policy "appointments_select" on appointments
  for select using (
    buyer_id = auth.uid()
    or exists (select 1 from sellers where sellers.id = appointments.seller_id and sellers.owner_id = auth.uid())
    or is_admin()
  );

-- Only the buyer themselves can create a request, only as 'pending', and
-- only if they're a verified student (same bar as leaving a review).
create policy "appointments_insert_buyer" on appointments
  for insert with check (
    buyer_id = auth.uid()
    and status = 'pending'
    and is_verified_student()
  );

create policy "appointments_update" on appointments
  for update using (
    buyer_id = auth.uid()
    or exists (select 1 from sellers where sellers.id = appointments.seller_id and sellers.owner_id = auth.uid())
    or is_admin()
  );

-- Same class of gap as 0009/0010: the UPDATE policy above only restricts
-- which ROW you can touch, not which columns or which status transitions
-- are valid. Without this, a buyer could confirm their own request, or
-- either party could quietly change the booked time instead of cancelling
-- and rebooking. This trigger is the actual enforcement of "buyers can
-- only cancel, sellers can only confirm/decline/cancel, nobody can alter
-- booking details after the fact."
create or replace function appointments_protect_privileged_columns()
returns trigger
language plpgsql
as $$
declare
  is_buyer boolean;
  is_seller boolean;
begin
  if is_admin() then
    return new;
  end if;

  is_buyer := old.buyer_id = auth.uid();
  is_seller := exists (
    select 1 from sellers where sellers.id = old.seller_id and sellers.owner_id = auth.uid()
  );

  if new.seller_id is distinct from old.seller_id
     or new.buyer_id is distinct from old.buyer_id
     or new.service_id is distinct from old.service_id
     or new.start_at is distinct from old.start_at
     or new.end_at is distinct from old.end_at then
    raise exception 'Appointment details cannot be changed -- cancel and rebook instead.';
  end if;

  if new.status is distinct from old.status then
    if is_seller then
      if old.status = 'pending' and new.status not in ('confirmed', 'declined') then
        raise exception 'A pending request can only be confirmed or declined.';
      elsif old.status = 'confirmed' and new.status is distinct from 'cancelled' then
        raise exception 'A confirmed appointment can only be cancelled.';
      elsif old.status in ('declined', 'cancelled') then
        raise exception 'This appointment is already closed.';
      end if;
    elsif is_buyer then
      if new.status is distinct from 'cancelled' then
        raise exception 'You can only cancel your own appointment.';
      end if;
      if old.status not in ('pending', 'confirmed') then
        raise exception 'This appointment can no longer be cancelled.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

alter function appointments_protect_privileged_columns() set search_path = public;
revoke all on function appointments_protect_privileged_columns() from public, anon, authenticated;

create trigger appointments_protect_privileged_columns_trigger
  before update on appointments
  for each row execute function appointments_protect_privileged_columns();

-- Same problem as get_review_author_names (0003): a seller needs to see the
-- display name of the buyer who booked with them, but profiles RLS
-- intentionally restricts SELECT to "own row or admin". Same fix: a narrow
-- SECURITY DEFINER function that only returns id + full_name, and only for
-- buyers of an appointment the caller is actually a party to (the buyer
-- themselves, the seller they booked with, or an admin) -- the same
-- visibility rule as appointments_select.
create or replace function get_appointment_party_names(profile_ids uuid[])
returns table(id uuid, full_name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name
  from profiles p
  where p.id = any(profile_ids)
    and exists (
      select 1 from appointments a
      left join sellers s on s.id = a.seller_id
      where a.buyer_id = p.id
        and (a.buyer_id = auth.uid() or s.owner_id = auth.uid() or is_admin())
    );
$$;

revoke all on function get_appointment_party_names(uuid[]) from public;
grant execute on function get_appointment_party_names(uuid[]) to authenticated;
