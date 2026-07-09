-- Change Requests — approval tracking, client visibility, and realtime
--
-- Fixes three gaps in the approval workflow:
--   1. Nothing recorded *who* approved/rejected a request — add resolved_by.
--   2. The client had no way to read back their own change requests at all
--      (change_requests is admin-only under RLS, and the client portal only
--      ever inserted via submit_change_request_by_token). Add a matching
--      security-definer read RPC, same pattern as the other *_by_token
--      functions in migration 5.
--   3. Approving/rejecting never surfaced anywhere the client could see it.
--      Reuse the existing booking_updates timeline (already exposed to the
--      client via get_booking_updates_by_token and already the mechanism
--      payments use — see trg_payments_after_insert_timeline in migration 2)
--      by auto-posting an update whenever status flips to approved/rejected.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Who resolved it
-- ─────────────────────────────────────────────────────────────────────────

alter table change_requests add column if not exists resolved_by uuid references admins(id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Let the client read back their own change requests (status, response)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function get_change_requests_by_token(p_access_token text)
returns table (
  id uuid,
  request_type text,
  details text,
  status change_request_status,
  submitted_at timestamptz,
  resolved_at timestamptz,
  admin_response text
) as $$
  select cr.id, cr.request_type, cr.details, cr.status, cr.submitted_at, cr.resolved_at, cr.admin_response
  from change_requests cr
  join bookings b on b.id = cr.booking_id
  where b.access_token = p_access_token
  order by cr.submitted_at desc;
$$ language sql security definer stable set search_path = public;

grant execute on function get_change_requests_by_token(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Auto-post a client-visible timeline entry when a request is resolved
-- ─────────────────────────────────────────────────────────────────────────

alter table booking_updates drop constraint if exists booking_updates_update_type_check;
alter table booking_updates add constraint booking_updates_update_type_check check (
  update_type in (
    'payment_update', 'menu_update', 'headcount_change',
    'general_update', 'confirmation', 'reminder', 'contract_update',
    'change_request_update'
  )
);

create or replace function trg_change_requests_after_update_timeline()
returns trigger as $$
begin
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    insert into booking_updates (booking_id, update_type, message, created_by)
    values (
      new.booking_id,
      'change_request_update',
      case
        when new.status = 'approved' then 'Your change request has been approved.'
        else 'Your change request was not approved.'
      end || coalesce(' Note: ' || new.admin_response, ''),
      'System'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists change_requests_after_update_timeline on change_requests;
create trigger change_requests_after_update_timeline
after update on change_requests
for each row execute function trg_change_requests_after_update_timeline();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Enable realtime so open admin/team sessions update without a refresh
-- ─────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'change_requests'
  ) then
    alter publication supabase_realtime add table change_requests;
  end if;

  -- Also needed by NotificationBell's realtime subscription, which watches
  -- both client-submitted-request tables so the unread badge updates live.
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'booking_menu_items'
  ) then
    alter publication supabase_realtime add table booking_menu_items;
  end if;
end $$;
