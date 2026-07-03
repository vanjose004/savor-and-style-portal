-- Fix booking code generator producing duplicate codes
-- (bookings_booking_code_key unique constraint violations).
--
-- Previous version derived the next number from count(*), which collides
-- when bookings are deleted (leaving gaps that get reused) or when two
-- bookings are inserted concurrently and both compute the same count.
--
-- Fix: serialize generation per-year with an advisory lock, derive the
-- next number from the max existing suffix, and verify the candidate
-- code doesn't already exist before returning it — retrying with the
-- next number if it does.

create or replace function generate_booking_code()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq int;
  v_candidate text;
  v_attempts int := 0;
begin
  -- Serialize concurrent callers for the same year so two simultaneous
  -- bookings can't compute the same next number.
  perform pg_advisory_xact_lock(hashtext('generate_booking_code_' || v_year));

  select coalesce(max(substring(booking_code from '(\d+)$')::int), 0) + 1
  into v_seq
  from bookings
  where booking_code like 'SS-' || v_year || '-%';

  loop
    v_candidate := 'SS-' || v_year || '-' || lpad(v_seq::text, 3, '0');

    exit when not exists (select 1 from bookings where booking_code = v_candidate);

    v_seq := v_seq + 1;
    v_attempts := v_attempts + 1;

    if v_attempts >= 50 then
      raise exception 'Could not generate a unique booking code after % attempts', v_attempts;
    end if;
  end loop;

  return v_candidate;
end;
$$ language plpgsql security definer set search_path = public;
