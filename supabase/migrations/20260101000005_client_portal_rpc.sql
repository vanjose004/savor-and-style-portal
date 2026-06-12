-- Savor and Style Catering Services — Client portal access
--
-- The client portal is unauthenticated (anon role) and reachable via a
-- secret `access_token` link. Rather than exposing booking-related tables
-- to anon directly, all reads/writes go through SECURITY DEFINER functions
-- below. Each function resolves the token to a single booking and returns
-- only the columns the client is allowed to see — internal admin notes,
-- other bookings, and other clients are never reachable this way.

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
