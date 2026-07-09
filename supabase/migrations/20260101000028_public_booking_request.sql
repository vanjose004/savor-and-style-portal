-- Public Booking Request — lets a prospective client submit a new booking
-- request from the public /book page, with no account or existing access
-- link. RLS on `clients`/`bookings` is admin-only (migration 4), so this
-- follows the same SECURITY DEFINER RPC pattern as the client portal RPCs
-- in migration 5 (e.g. submit_change_request_by_token).
--
-- Menu packages: no package-contents table exists in this schema (dishes
-- are always picked individually via booking_menu_items). "Package 1-4" is
-- just a preference label captured up front — the actual dish list is
-- finalized later through the existing menu-confirmation flow, same as
-- every other booking.

alter table bookings add column if not exists menu_package text
  check (menu_package in ('Package 1', 'Package 2', 'Package 3', 'Package 4'));

create or replace function submit_booking_request(
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_client_address text,
  p_event_type text,
  p_event_date date,
  p_event_time time,
  p_pax integer,
  p_event_motif text,
  p_venue text,
  p_venue_pin_location text,
  p_venue_access_time text,
  p_venue_contact_number text,
  p_menu_package text,
  p_lechon_chopping boolean,
  p_cake_table boolean,
  p_special_requests text
)
returns table (booking_id uuid, booking_code text, access_token text) as $$
declare
  v_client_id uuid;
  v_booking_id uuid;
  v_booking_code text;
  v_access_token text;
  v_freebies jsonb := '[]'::jsonb;
begin
  if coalesce(trim(p_client_name), '') = '' then
    raise exception 'Client name is required';
  end if;
  if coalesce(trim(p_client_email), '') = '' then
    raise exception 'Email is required';
  end if;
  if coalesce(trim(p_client_phone), '') = '' then
    raise exception 'Contact number is required';
  end if;
  if coalesce(trim(p_venue), '') = '' then
    raise exception 'Venue name is required';
  end if;
  if p_event_date is null then
    raise exception 'Event date is required';
  end if;
  if p_event_date < current_date then
    raise exception 'Event date cannot be in the past';
  end if;
  if p_pax is null or p_pax <= 0 then
    raise exception 'Number of guests is required';
  end if;

  if p_cake_table then
    v_freebies := jsonb_build_array(jsonb_build_object('name', 'Cake Table'));
  end if;

  insert into clients (name, email, phone, address)
  values (
    trim(p_client_name),
    trim(p_client_email),
    nullif(trim(p_client_phone), ''),
    nullif(trim(p_client_address), '')
  )
  returning id into v_client_id;

  insert into bookings (
    client_id, event_type, event_date, event_time, pax, event_motif, venue,
    venue_pin_location, venue_access_time, venue_contact_number,
    menu_package, lechon_chopping, freebies, special_requests, status
  )
  values (
    v_client_id, p_event_type, p_event_date, p_event_time, p_pax,
    nullif(trim(p_event_motif), ''), trim(p_venue),
    nullif(trim(p_venue_pin_location), ''), nullif(trim(p_venue_access_time), ''),
    nullif(trim(p_venue_contact_number), ''),
    p_menu_package, coalesce(p_lechon_chopping, false), v_freebies,
    nullif(trim(p_special_requests), ''), 'pending'
  )
  returning id, booking_code, access_token
  into v_booking_id, v_booking_code, v_access_token;

  return query select v_booking_id, v_booking_code, v_access_token;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function submit_booking_request(
  text, text, text, text, text, date, time, integer, text, text, text, text, text, text, boolean, boolean, text
) to anon, authenticated;
