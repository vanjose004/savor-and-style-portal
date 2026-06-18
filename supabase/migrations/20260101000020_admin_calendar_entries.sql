-- Savor and Style Portal — Admin calendar
--
-- Personal calendar entries (client meetings, reminders, to-dos) created
-- directly on the /admin/calendar page. Bookings already have their own
-- event_date and continue to be read straight from `bookings` on that page —
-- this table only holds entries that aren't bookings.

create table admin_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('meeting', 'reminder', 'task')),
  entry_date date not null,
  entry_time time,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_admin_calendar_entries_entry_date on admin_calendar_entries (entry_date);

alter table admin_calendar_entries enable row level security;

create policy "admins manage admin_calendar_entries" on admin_calendar_entries
  for all using (is_admin()) with check (is_admin());
