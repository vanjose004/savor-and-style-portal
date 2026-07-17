-- Staff Attendance / QR Check-in.
--
-- Two check-in points: a permanent home QR (no expiry) and a per-booking
-- event QR (encodes bookings.qr_token, valid only in a window around
-- event_time). Both are public, no-login forms — a staff member scans,
-- picks their name from a dropdown, and the pick resolves to a real
-- staff_id (required for the "hasn't checked in yet" reminder to be
-- possible at all — see api/cron/attendance-reminders.js).
--
-- qr_token is deliberately separate from bookings.access_token: the event
-- QR gets shared with the whole staff group chat, and access_token is
-- also the client's own portal link (payment/contact info) — keeping
-- them separate means the two can be rotated independently and staff
-- never incidentally get a link into the client's portal.
--
-- PH-timezone correctness: this codebase already hit and fixed a bug
-- where naive UTC date handling silently shifted dates by a day for the
-- Philippines (UTC+8). Every date/time computation below is explicitly
-- anchored to 'Asia/Manila', never bare now()/current_date.

alter table bookings add column if not exists qr_token text unique
  default encode(gen_random_bytes(16), 'hex');

create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  location_type text not null check (location_type in ('home', 'event')),
  booking_id uuid references bookings(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  check_date date not null,
  created_at timestamptz not null default now(),
  constraint attendance_logs_event_requires_booking check (
    (location_type = 'event' and booking_id is not null) or
    (location_type = 'home' and booking_id is null)
  )
);

create index if not exists idx_attendance_logs_staff_id on attendance_logs (staff_id);
create index if not exists idx_attendance_logs_booking_id on attendance_logs (booking_id);
create index if not exists idx_attendance_logs_check_date on attendance_logs (check_date);

create table if not exists attendance_reminder_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  reminded_at timestamptz not null default now(),
  unique (booking_id, staff_id)
);

alter table attendance_logs enable row level security;
alter table attendance_reminder_log enable row level security;

drop policy if exists "admins manage attendance_logs" on attendance_logs;
create policy "admins manage attendance_logs" on attendance_logs
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admins manage attendance_reminder_log" on attendance_reminder_log;
create policy "admins manage attendance_reminder_log" on attendance_reminder_log
  for all using (is_admin()) with check (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Shared window helper — the ONLY place the PH offset needs to be applied.
-- Combines the naive local date+time into a real instant anchored to
-- 'Asia/Manila', then widens by the confirmed 4h-before/8h-after window.
-- Falls back to all-day-valid PH-local when event_time is null.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function attendance_checkin_window(p_event_date date, p_event_time time)
returns table (window_start timestamptz, window_end timestamptz) as $$
begin
  if p_event_time is not null then
    window_start := ((p_event_date::text || ' ' || p_event_time::text)::timestamp
                       at time zone 'Asia/Manila') - interval '4 hours';
    window_end := ((p_event_date::text || ' ' || p_event_time::text)::timestamp
                       at time zone 'Asia/Manila') + interval '8 hours';
  else
    window_start := p_event_date::timestamp at time zone 'Asia/Manila';
    window_end := window_start + interval '1 day';
  end if;
  return next;
end;
$$ language plpgsql stable set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- RPCs — public (anon), same SECURITY DEFINER pattern as
-- submit_booking_request (migration 28): RLS on the underlying tables is
-- admin-only, so anon access goes exclusively through these functions.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function get_active_staff_list()
returns table (id uuid, name text) as $$
  select s.id, s.name from staff s where s.is_active = true order by s.name;
$$ language sql security definer stable set search_path = public;

create or replace function get_event_checkin_info(p_qr_token text)
returns table (
  booking_id uuid,
  booking_code text,
  event_type text,
  event_date date,
  event_time time,
  venue text,
  status booking_status,
  is_within_window boolean
) as $$
  select b.id, b.booking_code, b.event_type, b.event_date, b.event_time, b.venue, b.status,
         now() between w.window_start and w.window_end
  from bookings b
  cross join lateral attendance_checkin_window(b.event_date, b.event_time) w
  where b.qr_token = p_qr_token;
$$ language sql security definer stable set search_path = public;

create or replace function record_home_checkin(p_staff_id uuid)
returns table (attendance_id uuid, staff_name text, checked_in_at timestamptz, check_date date)
as $$
declare
  v_staff_name text;
  v_id uuid;
  v_now timestamptz := now();
  v_check_date date;
begin
  select s.name into v_staff_name from staff s where s.id = p_staff_id and s.is_active = true;
  if v_staff_name is null then
    raise exception 'Staff member not found or inactive';
  end if;

  v_check_date := (v_now at time zone 'Asia/Manila')::date;

  insert into attendance_logs (staff_id, location_type, booking_id, checked_in_at, check_date)
  values (p_staff_id, 'home', null, v_now, v_check_date)
  returning attendance_logs.id into v_id;

  return query select v_id, v_staff_name, v_now, v_check_date;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function record_event_checkin(p_qr_token text, p_staff_id uuid)
returns table (
  attendance_id uuid,
  staff_name text,
  booking_id uuid,
  booking_code text,
  venue text,
  checked_in_at timestamptz,
  check_date date
) as $$
declare
  v_booking bookings%rowtype;
  v_staff_name text;
  v_win record;
  v_id uuid;
  v_now timestamptz := now();
  v_check_date date;
begin
  select * into v_booking from bookings b where b.qr_token = p_qr_token;
  if v_booking.id is null then
    raise exception 'Invalid QR code';
  end if;

  select s.name into v_staff_name from staff s where s.id = p_staff_id and s.is_active = true;
  if v_staff_name is null then
    raise exception 'Staff member not found or inactive';
  end if;

  select * into v_win from attendance_checkin_window(v_booking.event_date, v_booking.event_time);
  if v_now < v_win.window_start or v_now > v_win.window_end then
    raise exception 'This QR code is not valid right now for this event';
  end if;

  v_check_date := (v_now at time zone 'Asia/Manila')::date;

  insert into attendance_logs (staff_id, location_type, booking_id, checked_in_at, check_date)
  values (p_staff_id, 'event', v_booking.id, v_now, v_check_date)
  returning attendance_logs.id into v_id;

  return query select v_id, v_staff_name, v_booking.id, v_booking.booking_code, v_booking.venue, v_now, v_check_date;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function get_active_staff_list() to anon, authenticated;
grant execute on function get_event_checkin_info(text) to anon, authenticated;
grant execute on function record_home_checkin(uuid) to anon, authenticated;
grant execute on function record_event_checkin(text, uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime — so the admin Attendance page updates live on a new scan,
-- same opt-in pattern as migrations 26/27/29.
-- ─────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance_logs'
  ) then
    alter publication supabase_realtime add table attendance_logs;
  end if;
end $$;
