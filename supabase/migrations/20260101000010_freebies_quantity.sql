-- Savor and Style Catering Services — Freebies quantity support
--
-- freebies becomes jsonb so each item can carry an optional `quantity`
-- (e.g. Event Backdrop panels, Extra Food Warmer units, VIP Table seats).
-- Existing text[] entries are migrated to {"name": "<value>"} objects.

alter table bookings
  alter column freebies drop default;

-- ALTER COLUMN ... USING can't contain a subquery directly, so do the
-- text[] -> jsonb conversion via a temporary helper function.
create function _migrate_freebies_to_jsonb(items text[])
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', elem)), '[]'::jsonb)
  from unnest(items) as elem
$$;

alter table bookings
  alter column freebies type jsonb
  using _migrate_freebies_to_jsonb(freebies);

drop function _migrate_freebies_to_jsonb(text[]);

alter table bookings
  alter column freebies set default '[]'::jsonb;

-- get_booking_by_token's return columns are changing (freebies text[] ->
-- jsonb), so it must be dropped before being recreated.
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
  freebies jsonb,
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
