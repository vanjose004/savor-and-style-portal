-- ============================================================================
-- Savor and Style Catering Services — Combined fresh-start migration
--
-- This script:
--   1. Drops any objects from a previous partial run (safe for a fresh
--      project with no real data yet).
--   2. Re-creates the full schema from migrations 1-7, in order.
--
-- Run this ONCE, in a single "New Query" tab in the Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- CLEANUP — remove anything left over from a previous attempt
-- ============================================================================

drop view if exists staff_event_bookings;

drop function if exists get_booking_by_token(text);
drop function if exists get_booking_menu_items_by_token(text);
drop function if exists get_booking_payments_by_token(text);
drop function if exists get_booking_updates_by_token(text);
drop function if exists submit_change_request_by_token(text, text, text);
drop function if exists submit_menu_suggestion_by_token(text, text, text, text);
drop function if exists get_access_token_by_booking_code(text);

drop function if exists is_admin();
drop function if exists is_staff();

drop table if exists admins cascade;
drop table if exists event_assignments cascade;
drop table if exists checklists cascade;
drop table if exists change_requests cascade;
drop table if exists booking_updates cascade;
drop table if exists payments cascade;
drop table if exists booking_menu_items cascade;
drop table if exists bookings cascade;
drop table if exists clients cascade;
drop table if exists staff cascade;
drop table if exists menu_master cascade;

drop function if exists set_updated_at() cascade;
drop function if exists generate_booking_code() cascade;
drop function if exists trg_bookings_before_insert() cascade;
drop function if exists recalc_booking_balance(uuid) cascade;
drop function if exists trg_bookings_recalc_balance() cascade;
drop function if exists trg_payments_recalc_balance() cascade;
drop function if exists generate_ar_number() cascade;
drop function if exists trg_payments_before_save() cascade;
drop function if exists trg_payments_after_insert_timeline() cascade;

drop type if exists booking_status;
drop type if exists menu_item_status;
drop type if exists change_request_status;

-- ============================================================================
-- MIGRATION 1 — Extensions, enum types, and base tables
-- ============================================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────

create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type menu_item_status as enum ('suggested', 'confirmed', 'rejected');
create type change_request_status as enum ('pending', 'approved', 'rejected');

-- ─────────────────────────────────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────────────────────────────────

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────

create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  client_id uuid not null references clients(id) on delete restrict,
  event_type text not null check (
    event_type in ('Birthday', 'Wedding', 'Corporate', 'Binyag/Debut/Graduation', 'Houseblessing', 'Other')
  ),
  event_date date not null,
  event_time time,
  venue text,
  pax integer,
  status booking_status not null default 'pending',
  menu_confirmed boolean not null default false,
  special_requests text,
  total_amount numeric(10, 2) not null default 0,
  reservation_fee numeric(10, 2) not null default 5000,
  balance numeric(10, 2) not null default 0,
  contract_signed boolean not null default false,
  contract_signed_at timestamptz,
  notes text,
  service_hours integer not null default 5,
  lechon_chopping boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  access_token text not null unique default encode(gen_random_bytes(16), 'hex')
);

create index idx_bookings_client_id on bookings (client_id);
create index idx_bookings_event_date on bookings (event_date);
create index idx_bookings_status on bookings (status);
create index idx_bookings_access_token on bookings (access_token);

comment on column bookings.notes is 'Internal admin notes — never exposed to the client portal.';

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKING MENU ITEMS
-- ─────────────────────────────────────────────────────────────────────────

create table booking_menu_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  dish_name text not null,
  category text not null check (
    category in ('Pork', 'Chicken', 'Pasta', 'Beef', 'Vegetable', 'Fish', 'Juice', 'Dessert')
  ),
  suggested_by text not null check (suggested_by in ('client', 'admin')),
  status menu_item_status not null default 'suggested',
  notes text
);

create index idx_booking_menu_items_booking_id on booking_menu_items (booking_id);

-- ─────────────────────────────────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  payment_type text not null check (
    payment_type in ('reservation_fee', 'downpayment', 'partial', 'balance')
  ),
  payment_method text not null check (
    payment_method in ('GCash', 'Maya', 'Cash', 'Bank Transfer', 'Credit Card', 'Check')
  ),
  reference_number text,
  credit_card_fee numeric(10, 2) not null default 0,
  paid_at timestamptz not null default now(),
  notes text,
  ar_number text,
  ar_generated boolean not null default false
);

create index idx_payments_booking_id on payments (booking_id);

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKING UPDATES (client timeline)
-- ─────────────────────────────────────────────────────────────────────────

create table booking_updates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  update_type text not null check (
    update_type in (
      'payment_update', 'menu_update', 'headcount_change',
      'general_update', 'confirmation', 'reminder', 'contract_update'
    )
  ),
  message text not null,
  internal_note text,
  created_at timestamptz not null default now(),
  created_by text
);

create index idx_booking_updates_booking_id on booking_updates (booking_id);

comment on column booking_updates.internal_note is 'Admin-only note — never exposed to the client portal.';

-- ─────────────────────────────────────────────────────────────────────────
-- CHANGE REQUESTS (from client)
-- ─────────────────────────────────────────────────────────────────────────

create table change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  request_type text not null check (
    request_type in ('menu_suggestion', 'headcount_change', 'venue_change', 'special_request', 'other')
  ),
  details text not null,
  status change_request_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  admin_response text
);

create index idx_change_requests_booking_id on change_requests (booking_id);

-- ─────────────────────────────────────────────────────────────────────────
-- STAFF (id mirrors auth.users.id for staff logins)
-- ─────────────────────────────────────────────────────────────────────────

create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('waiter', 'team_leader', 'cook', 'driver')),
  phone text,
  email text,
  is_active boolean not null default true
);

-- ─────────────────────────────────────────────────────────────────────────
-- EVENT ASSIGNMENTS
-- ─────────────────────────────────────────────────────────────────────────

create table event_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  role_for_event text,
  unique (booking_id, staff_id)
);

create index idx_event_assignments_booking_id on event_assignments (booking_id);
create index idx_event_assignments_staff_id on event_assignments (staff_id);

-- ─────────────────────────────────────────────────────────────────────────
-- CHECKLISTS
-- ─────────────────────────────────────────────────────────────────────────

create table checklists (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  item text not null,
  assigned_to uuid references staff(id) on delete set null,
  is_done boolean not null default false,
  done_at timestamptz,
  category text not null check (
    category in ('setup', 'food_prep', 'equipment', 'service', 'cleanup')
  )
);

create index idx_checklists_booking_id on checklists (booking_id);

-- ─────────────────────────────────────────────────────────────────────────
-- MENU MASTER
-- ─────────────────────────────────────────────────────────────────────────

create table menu_master (
  id uuid primary key default gen_random_uuid(),
  dish_name text not null,
  category text not null check (
    category in ('Pork', 'Chicken', 'Pasta', 'Beef', 'Vegetable', 'Fish', 'Juice', 'Dessert')
  ),
  is_available boolean not null default true,
  notes text
);

create index idx_menu_master_category on menu_master (category);

-- ============================================================================
-- MIGRATION 2 — Functions & triggers
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ─────────────────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_set_updated_at
before update on bookings
for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Booking code generator: SS-YYYY-NNN
-- ─────────────────────────────────────────────────────────────────────────

create or replace function generate_booking_code()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from bookings
  where booking_code like 'SS-' || v_year || '-%';

  return 'SS-' || v_year || '-' || lpad(v_seq::text, 3, '0');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_bookings_before_insert()
returns trigger as $$
begin
  if new.booking_code is null or new.booking_code = '' then
    new.booking_code := generate_booking_code();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_before_insert
before insert on bookings
for each row execute function trg_bookings_before_insert();

-- ─────────────────────────────────────────────────────────────────────────
-- Balance computation: bookings.balance = total_amount - sum(payments.amount)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function recalc_booking_balance(p_booking_id uuid)
returns void as $$
begin
  update bookings
  set balance = total_amount - coalesce(
    (select sum(amount) from payments where booking_id = p_booking_id), 0
  )
  where id = p_booking_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Recompute balance whenever the contract total changes
create or replace function trg_bookings_recalc_balance()
returns trigger as $$
begin
  new.balance := new.total_amount - coalesce(
    (select sum(amount) from payments where booking_id = new.id), 0
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_recalc_balance
before insert or update of total_amount on bookings
for each row execute function trg_bookings_recalc_balance();

-- Recompute balance whenever payments change
create or replace function trg_payments_recalc_balance()
returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    perform recalc_booking_balance(old.booking_id);
    return old;
  end if;

  perform recalc_booking_balance(new.booking_id);

  if (tg_op = 'UPDATE' and new.booking_id <> old.booking_id) then
    perform recalc_booking_balance(old.booking_id);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger payments_recalc_balance
after insert or update or delete on payments
for each row execute function trg_payments_recalc_balance();

-- ─────────────────────────────────────────────────────────────────────────
-- AR number generator: AR-YYYY-NNNN
-- ─────────────────────────────────────────────────────────────────────────

create or replace function generate_ar_number()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from payments
  where ar_number like 'AR-' || v_year || '-%';

  return 'AR-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Payments: auto AR number + 5% credit card terminal fee
-- ─────────────────────────────────────────────────────────────────────────

create or replace function trg_payments_before_save()
returns trigger as $$
begin
  if new.payment_method = 'Credit Card' then
    new.credit_card_fee := round(new.amount * 0.05, 2);
  else
    new.credit_card_fee := 0;
  end if;

  if tg_op = 'INSERT' and (new.ar_number is null or new.ar_number = '') then
    new.ar_number := generate_ar_number();
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger payments_before_save
before insert or update on payments
for each row execute function trg_payments_before_save();

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-post a client timeline update whenever a payment is recorded
-- ─────────────────────────────────────────────────────────────────────────

create or replace function trg_payments_after_insert_timeline()
returns trigger as $$
begin
  insert into booking_updates (booking_id, update_type, message, created_by)
  values (
    new.booking_id,
    'payment_update',
    'A payment of ' || to_char(new.amount, 'FM₱999,999,990.00') || ' via ' || new.payment_method || ' was received. Thank you!',
    'System'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger payments_after_insert_timeline
after insert on payments
for each row execute function trg_payments_after_insert_timeline();

-- ============================================================================
-- MIGRATION 3 — Admins & staff role helpers
-- ============================================================================

create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);

-- Returns true if the currently authenticated user is an admin
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admins where id = auth.uid());
$$ language sql security definer stable set search_path = public;

-- Returns true if the currently authenticated user is an active staff member
create or replace function is_staff()
returns boolean as $$
  select exists (select 1 from staff where id = auth.uid() and is_active = true);
$$ language sql security definer stable set search_path = public;

-- ============================================================================
-- MIGRATION 4 — Row Level Security
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- Enable RLS on every table
-- ─────────────────────────────────────────────────────────────────────────

alter table clients enable row level security;
alter table bookings enable row level security;
alter table booking_menu_items enable row level security;
alter table payments enable row level security;
alter table booking_updates enable row level security;
alter table change_requests enable row level security;
alter table staff enable row level security;
alter table event_assignments enable row level security;
alter table checklists enable row level security;
alter table menu_master enable row level security;
alter table admins enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- Admin: full access to every table
-- ─────────────────────────────────────────────────────────────────────────

create policy "admins manage clients" on clients
  for all using (is_admin()) with check (is_admin());

create policy "admins manage bookings" on bookings
  for all using (is_admin()) with check (is_admin());

create policy "admins manage booking_menu_items" on booking_menu_items
  for all using (is_admin()) with check (is_admin());

create policy "admins manage payments" on payments
  for all using (is_admin()) with check (is_admin());

create policy "admins manage booking_updates" on booking_updates
  for all using (is_admin()) with check (is_admin());

create policy "admins manage change_requests" on change_requests
  for all using (is_admin()) with check (is_admin());

create policy "admins manage staff" on staff
  for all using (is_admin()) with check (is_admin());

create policy "admins manage event_assignments" on event_assignments
  for all using (is_admin()) with check (is_admin());

create policy "admins manage checklists" on checklists
  for all using (is_admin()) with check (is_admin());

create policy "admins manage menu_master" on menu_master
  for all using (is_admin()) with check (is_admin());

create policy "admins manage admins" on admins
  for all using (is_admin()) with check (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Menu master: public read (dish list only — no sensitive data)
-- Used by the admin menu manager, the client menu suggestion picker, and staff.
-- ─────────────────────────────────────────────────────────────────────────

create policy "anyone can view menu master" on menu_master
  for select using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Staff: own profile and own assignments only
-- ─────────────────────────────────────────────────────────────────────────

create policy "staff can view own record" on staff
  for select using (id = auth.uid());

create policy "staff can view own assignments" on event_assignments
  for select using (staff_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Staff: confirmed menu for events they're assigned to
-- ─────────────────────────────────────────────────────────────────────────

create policy "staff can view confirmed menu for assigned events" on booking_menu_items
  for select using (
    status = 'confirmed'
    and exists (
      select 1 from event_assignments ea
      where ea.booking_id = booking_menu_items.booking_id
        and ea.staff_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Staff: checklist for events they're assigned to.
-- Staff may only flip is_done/done_at — never edit item text or category.
-- ─────────────────────────────────────────────────────────────────────────

create policy "staff can view checklist for assigned events" on checklists
  for select using (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = checklists.booking_id
        and ea.staff_id = auth.uid()
    )
  );

create policy "staff can mark checklist items done for assigned events" on checklists
  for update using (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = checklists.booking_id
        and ea.staff_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = checklists.booking_id
        and ea.staff_id = auth.uid()
    )
  );

-- Lock column-level UPDATE access down to just completion fields
revoke update on checklists from authenticated, anon;
grant update (is_done, done_at) on checklists to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Staff: read-only view of their assigned events.
-- No client contact details, payments, contract status, or internal notes —
-- the view runs with the privileges of its owner, bypassing bookings' RLS,
-- but its WHERE clause still filters by the calling staff member's auth.uid().
-- ─────────────────────────────────────────────────────────────────────────

create view staff_event_bookings as
select
  b.id,
  b.booking_code,
  b.event_type,
  b.event_date,
  b.event_time,
  b.venue,
  b.pax,
  b.status,
  b.special_requests,
  b.menu_confirmed,
  b.service_hours,
  b.lechon_chopping,
  ea.role_for_event
from bookings b
join event_assignments ea on ea.booking_id = b.id
where ea.staff_id = auth.uid();

grant select on staff_event_bookings to authenticated;

-- ============================================================================
-- MIGRATION 5 — Client portal access (SECURITY DEFINER RPCs)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- Booking summary + payment status
-- ─────────────────────────────────────────────────────────────────────────

create or replace function get_booking_by_token(p_access_token text)
returns table (
  id uuid,
  booking_code text,
  event_type text,
  event_date date,
  event_time time,
  venue text,
  pax integer,
  status booking_status,
  menu_confirmed boolean,
  special_requests text,
  total_amount numeric,
  reservation_fee numeric,
  balance numeric,
  contract_signed boolean,
  contract_signed_at timestamptz,
  service_hours integer,
  lechon_chopping boolean,
  client_name text,
  client_first_name text
) as $$
  select
    b.id,
    b.booking_code,
    b.event_type,
    b.event_date,
    b.event_time,
    b.venue,
    b.pax,
    b.status,
    b.menu_confirmed,
    b.special_requests,
    b.total_amount,
    b.reservation_fee,
    b.balance,
    b.contract_signed,
    b.contract_signed_at,
    b.service_hours,
    b.lechon_chopping,
    c.name,
    split_part(c.name, ' ', 1)
  from bookings b
  join clients c on c.id = b.client_id
  where b.access_token = p_access_token;
$$ language sql security definer stable set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Menu items (confirmed dishes + the client's own pending suggestions)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function get_booking_menu_items_by_token(p_access_token text)
returns table (
  id uuid,
  dish_name text,
  category text,
  suggested_by text,
  status menu_item_status,
  notes text
) as $$
  select bmi.id, bmi.dish_name, bmi.category, bmi.suggested_by, bmi.status, bmi.notes
  from booking_menu_items bmi
  join bookings b on b.id = bmi.booking_id
  where b.access_token = p_access_token
  order by bmi.category, bmi.dish_name;
$$ language sql security definer stable set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Payment history (no internal notes)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function get_booking_payments_by_token(p_access_token text)
returns table (
  id uuid,
  amount numeric,
  payment_type text,
  payment_method text,
  reference_number text,
  paid_at timestamptz,
  ar_number text,
  ar_generated boolean
) as $$
  select p.id, p.amount, p.payment_type, p.payment_method, p.reference_number, p.paid_at, p.ar_number, p.ar_generated
  from payments p
  join bookings b on b.id = p.booking_id
  where b.access_token = p_access_token
  order by p.paid_at desc;
$$ language sql security definer stable set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Updates timeline (internal_note is never returned)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function get_booking_updates_by_token(p_access_token text)
returns table (
  id uuid,
  update_type text,
  message text,
  created_at timestamptz
) as $$
  select bu.id, bu.update_type, bu.message, bu.created_at
  from booking_updates bu
  join bookings b on b.id = bu.booking_id
  where b.access_token = p_access_token
  order by bu.created_at desc;
$$ language sql security definer stable set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Submit a change request (headcount, menu, venue, special request, other)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function submit_change_request_by_token(
  p_access_token text,
  p_request_type text,
  p_details text
)
returns void as $$
declare
  v_booking_id uuid;
begin
  select id into v_booking_id from bookings where access_token = p_access_token;

  if v_booking_id is null then
    raise exception 'Invalid booking access token';
  end if;

  insert into change_requests (booking_id, request_type, details)
  values (v_booking_id, p_request_type, p_details);
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Submit a menu dish suggestion (always recorded as suggested_by = 'client')
-- ─────────────────────────────────────────────────────────────────────────

create or replace function submit_menu_suggestion_by_token(
  p_access_token text,
  p_dish_name text,
  p_category text,
  p_notes text default null
)
returns void as $$
declare
  v_booking_id uuid;
begin
  select id into v_booking_id from bookings where access_token = p_access_token;

  if v_booking_id is null then
    raise exception 'Invalid booking access token';
  end if;

  insert into booking_menu_items (booking_id, dish_name, category, suggested_by, status, notes)
  values (v_booking_id, p_dish_name, p_category, 'client', 'suggested', p_notes);
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Grants — anon (the client portal is unauthenticated)
-- ─────────────────────────────────────────────────────────────────────────

grant execute on function get_booking_by_token(text) to anon, authenticated;
grant execute on function get_booking_menu_items_by_token(text) to anon, authenticated;
grant execute on function get_booking_payments_by_token(text) to anon, authenticated;
grant execute on function get_booking_updates_by_token(text) to anon, authenticated;
grant execute on function submit_change_request_by_token(text, text, text) to anon, authenticated;
grant execute on function submit_menu_suggestion_by_token(text, text, text, text) to anon, authenticated;

-- ============================================================================
-- MIGRATION 6 — Master menu seed data
-- ============================================================================

insert into menu_master (dish_name, category) values
  -- Pork
  ('Pork Hamonado', 'Pork'),
  ('Pork Asado', 'Pork'),
  ('Creamy Menudo in Butter', 'Pork'),
  ('Filipino Menudo', 'Pork'),
  ('Hickory Pork', 'Pork'),
  ('Crispy Pork Kare-Kare', 'Pork'),
  ('Pork Asado (Bulacan)', 'Pork'),

  -- Chicken
  ('Chicken Alexander', 'Chicken'),
  ('Creamy Chicken with Pineapples', 'Chicken'),
  ('Chicken Pastel', 'Chicken'),
  ('Chinese Style Roasted Chicken', 'Chicken'),
  ('Chicken Afritada', 'Chicken'),
  ('Chicken Buffalo', 'Chicken'),
  ('Chicken BBQ', 'Chicken'),
  ('Chicken Hamonado', 'Chicken'),
  ('Hickory Chicken', 'Chicken'),

  -- Pasta
  ('Filipino Spaghetti', 'Pasta'),
  ('Italian Spaghetti (Bit Sour)', 'Pasta'),
  ('Carbonara', 'Pasta'),
  ('Tuna Carbonara', 'Pasta'),
  ('Chicken Alfredo', 'Pasta'),
  ('Pancit Grande (all kinds by request)', 'Pasta'),
  ('Pesto Pasta', 'Pasta'),
  ('Charlie Chan Pasta', 'Pasta'),

  -- Beef
  ('Beef Broccoli', 'Beef'),
  ('Beef Caldereta', 'Beef'),
  ('Creamy Beef in Mushroom', 'Beef'),
  ('Beef Salpicao', 'Beef'),
  ('Beef Kare-Kare', 'Beef'),
  ('Beef Pares (Chinese Spice)', 'Beef'),

  -- Vegetable
  ('Mixed Veggies', 'Vegetable'),
  ('Chopsuey (Creamy or Original)', 'Vegetable'),
  ('Cesar Salad', 'Vegetable'),
  ('Lumpiang Gulay', 'Vegetable'),
  ('Stir Fry Mongolian Vegetables', 'Vegetable'),
  ('Tofu with Beans in Oyster Sauce', 'Vegetable'),
  ('Pochero', 'Vegetable'),

  -- Fish
  ('Fish Fillet in White Sauce', 'Fish'),
  ('Fish Fillet in Sweet and Sour Sauce', 'Fish'),
  ('Fish Fillet in Sweet Lemon Sauce', 'Fish'),
  ('Fish Fillet in Thousand Island Sauce', 'Fish'),
  ('Fish Fillet and Tofu in Oyster Sauce', 'Fish'),

  -- Juice
  ('Blue Lemonade', 'Juice'),
  ('Red Tea', 'Juice'),
  ('Lemon Iced Tea', 'Juice'),
  ('Cucumber Lemonade', 'Juice'),
  ('Black Gulaman', 'Juice'),

  -- Desserts
  ('Panna Cotta', 'Dessert'),
  ('Buko Pandan', 'Dessert'),
  ('Mango Tapioca', 'Dessert'),
  ('Coffee Jelly', 'Dessert'),
  ('Fruit Salad', 'Dessert'),
  ('Ube Jelly Tapioca', 'Dessert'),
  ('Strawberry Jelly Tapioca', 'Dessert'),
  ('Choco Jelly Tapioca', 'Dessert');

-- ============================================================================
-- MIGRATION 7 — Add created_at to booking_menu_items
-- ============================================================================

alter table booking_menu_items
  add column created_at timestamptz not null default now();

-- ============================================================================
-- MIGRATION 8 — Booking code lookup
-- ============================================================================

create or replace function get_access_token_by_booking_code(p_booking_code text)
returns text as $$
  select access_token from bookings where booking_code = p_booking_code;
$$ language sql security definer stable set search_path = public;

grant execute on function get_access_token_by_booking_code(text) to anon, authenticated;
