-- Savor and Style Catering Services — Event motif & freebies
--
-- event_motif: free-text theme/motif for the event, shown to admin and client.
-- freebies: admin-curated list of complimentary inclusions for this booking.
-- Nothing is shown to the client until the admin adds an item.

alter table bookings
  add column event_motif text,
  add column freebies text[] not null default '{}';

-- get_booking_by_token's return columns are changing, so it must be dropped
-- before being recreated (CREATE OR REPLACE cannot change a function's
-- return type).
drop function if exists get_booking_by_token(text);

create function get_booking_by_token(p_access_token text)
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
  event_motif text,
  freebies text[],
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
    b.event_motif,
    b.freebies,
    c.name,
    split_part(c.name, ' ', 1)
  from bookings b
  join clients c on c.id = b.client_id
  where b.access_token = p_access_token;
$$ language sql security definer stable set search_path = public;

grant execute on function get_booking_by_token(text) to anon, authenticated;
