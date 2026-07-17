-- New booking submissions (from the public /book page) didn't show up
-- anywhere live: NotificationBell only ever tracked change_requests and
-- booking_menu_items (never bookings itself), and neither NotificationBell
-- nor AdminDashboard had a realtime subscription on the bookings table —
-- so a fresh public booking request required a manual page reload to
-- notice, and never appeared as a bell notification at all.
--
-- Fix needs two things this migration provides:
--   1. bookings.is_read, same read-tracking pattern as migration 25 added
--      for change_requests/booking_menu_items, so the bell can show an
--      unread badge and mark-as-read on click.
--   2. bookings added to the supabase_realtime publication, so postgres_changes
--      subscriptions on it actually fire (change_requests/booking_menu_items/
--      booking_updates were added in migrations 26-27; bookings never was).

alter table bookings add column if not exists is_read boolean not null default false;
create index if not exists idx_bookings_is_read on bookings (is_read);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table bookings;
  end if;
end $$;
