-- Savor and Style Catering Services — Kids fields for Kiddie Party /
-- Christening/Dedication bookings
--
-- Adds num_adults, num_kids, and kids_menu (a simple list of pre-selected
-- kids menu item names) to bookings, and extends get_booking_by_token so the
-- client portal can display them.

alter table bookings
  add column num_adults integer,
  add column num_kids integer,
  add column kids_menu jsonb not null default '[]'::jsonb;

-- get_booking_by_token's return columns are changing, so it must be dropped
-- before being recreated.
drop function if exists get_booking_by_token(text);

create function get_booking_by_token(p_access_token text)
returns table (
  id uuid,
  booking_code text,
  event_type text,
  event_date date,
  event_time time,
  venue text,
  venue_pin_location text,
  venue_access_time text,
  venue_contact_number text,
  pax integer,
  num_adults integer,
  num_kids integer,
  kids_menu jsonb,
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
  event_motif text,
  freebies jsonb,
  client_name text,
  client_first_name text,
  client_phone text,
  client_address text
) as $$
  select
    b.id,
    b.booking_code,
    b.event_type,
    b.event_date,
    b.event_time,
    b.venue,
    b.venue_pin_location,
    b.venue_access_time,
    b.venue_contact_number,
    b.pax,
    b.num_adults,
    b.num_kids,
    b.kids_menu,
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
    b.event_motif,
    b.freebies,
    c.name,
    split_part(c.name, ' ', 1),
    c.phone,
    c.address
  from bookings b
  join clients c on c.id = b.client_id
  where b.access_token = p_access_token;
$$ language sql security definer stable set search_path = public;

grant execute on function get_booking_by_token(text) to anon, authenticated;
