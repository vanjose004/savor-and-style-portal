-- Savor and Style Catering Services — Booking code lookup
--
-- Lets the public landing page's "View My Booking" form resolve a
-- human-readable booking code (e.g. SS-2026-001) to the booking's
-- access_token, so the client can be redirected to /booking/:access_token.
-- Returns null if no booking matches — never reveals which codes exist.

create or replace function get_access_token_by_booking_code(p_booking_code text)
returns text as $$
  select access_token from bookings where booking_code = p_booking_code;
$$ language sql security definer stable set search_path = public;

grant execute on function get_access_token_by_booking_code(text) to anon, authenticated;
