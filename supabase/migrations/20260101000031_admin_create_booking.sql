-- Lets the Telegram bot create a new booking + client atomically in one
-- call. Deliberately NOT two separate INSERTs from application code:
-- if a client row were created successfully but the booking insert then
-- failed, the client would be orphaned, and retrying (e.g. tapping
-- Confirm again after a transient DB error) would create a DUPLICATE
-- client row. Wrapping both in one plpgsql function makes the whole
-- thing one transaction — nothing is inserted unless everything
-- succeeds, so retrying after a failure is always safe.
--
-- Admin-initiated (unlike submit_booking_request, the public /book
-- form's RPC) — the bot always shows a confirmation card before calling
-- this, so validation here is a safety net, not the primary UX.
--
-- is_read is set true immediately: unlike a client's public submission
-- (which should notify the admin), this booking was just typed in by
-- the admin themselves, so there's nothing to "notify" them about.

create or replace function create_admin_booking(
  p_client_name text,
  p_event_type text,
  p_event_date date,
  p_pax integer,
  p_total_amount numeric
)
returns table (booking_id uuid, booking_code text) as $$
declare
  v_client_id uuid;
  v_booking_id uuid;
  v_booking_code text;
begin
  if coalesce(trim(p_client_name), '') = '' then
    raise exception 'Client name is required';
  end if;
  if p_event_date is null then
    raise exception 'Event date is required';
  end if;
  if p_pax is null or p_pax <= 0 then
    raise exception 'Pax must be greater than 0';
  end if;
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Total amount must be greater than 0';
  end if;

  insert into clients (name)
  values (trim(p_client_name))
  returning id into v_client_id;

  -- booking_code/access_token intentionally table-qualified in RETURNING
  -- (see migration 28) — this function's own RETURNS TABLE(booking_id,
  -- booking_code) implicitly declares those same names as PL/pgSQL
  -- variables, ambiguous against the bookings columns of the same name.
  insert into bookings (client_id, event_type, event_date, pax, total_amount, status, is_read)
  values (v_client_id, p_event_type, p_event_date, p_pax, p_total_amount, 'pending', true)
  returning id, bookings.booking_code
  into v_booking_id, v_booking_code;

  return query select v_booking_id, v_booking_code;
end;
$$ language plpgsql security definer set search_path = public;

-- Bot-only, called with the service role key (which bypasses RLS
-- entirely regardless of grants) — explicitly NOT granted to
-- anon/authenticated, unlike submit_booking_request. Revoking the
-- default PUBLIC execute grant keeps this un-callable from any
-- ordinary web session, consistent with the least-privilege pattern
-- used throughout this schema.
revoke all on function create_admin_booking(text, text, date, integer, numeric) from public;
