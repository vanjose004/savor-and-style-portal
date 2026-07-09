-- Enable realtime on booking_updates so the admin Updates Timeline (and the
-- Contract/Booking Form card's change-request feed) refreshes live —
-- including the change_request_update rows auto-posted by
-- trg_change_requests_after_update_timeline (migration 26) when a request
-- is approved or rejected.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'booking_updates'
  ) then
    alter publication supabase_realtime add table booking_updates;
  end if;
end $$;
