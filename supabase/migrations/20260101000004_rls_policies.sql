-- Savor and Style Catering Services — Row Level Security
--
-- Roles:
--   admin (table `admins`)        — full access to everything
--   staff (table `staff`)         — only their assigned events, no payment/contract data
--   client (anon, via access link) — handled entirely through SECURITY DEFINER RPCs
--                                     in migration 5; no direct table grants here.

-- ─────────────────────────────────────────────────────────────────────────
-- Enable RLS on every table
-- ─────────────────────────────────────────────────────────────────────────

alter table clients enable row level security;
alter table bookings enable row level security;
alter table booking_menu_items enable row level security;
alter table payments enable row level security;
alter table booking_updates enable row level security;
alter table change_requests enable row level security;
alter table staff enable row level security;
alter table event_assignments enable row level security;
alter table checklists enable row level security;
alter table menu_master enable row level security;
alter table admins enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- Admin: full access to every table
-- ─────────────────────────────────────────────────────────────────────────

create policy "admins manage clients" on clients
  for all using (is_admin()) with check (is_admin());

create policy "admins manage bookings" on bookings
  for all using (is_admin()) with check (is_admin());

create policy "admins manage booking_menu_items" on booking_menu_items
  for all using (is_admin()) with check (is_admin());

create policy "admins manage payments" on payments
  for all using (is_admin()) with check (is_admin());

create policy "admins manage booking_updates" on booking_updates
  for all using (is_admin()) with check (is_admin());

create policy "admins manage change_requests" on change_requests
  for all using (is_admin()) with check (is_admin());

create policy "admins manage staff" on staff
  for all using (is_admin()) with check (is_admin());

create policy "admins manage event_assignments" on event_assignments
  for all using (is_admin()) with check (is_admin());

create policy "admins manage checklists" on checklists
  for all using (is_admin()) with check (is_admin());

create policy "admins manage menu_master" on menu_master
  for all using (is_admin()) with check (is_admin());

create policy "admins manage admins" on admins
  for all using (is_admin()) with check (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Menu master: public read (dish list only — no sensitive data)
-- Used by the admin menu manager, the client menu suggestion picker, and staff.
-- ─────────────────────────────────────────────────────────────────────────

create policy "anyone can view menu master" on menu_master
  for select using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Staff: own profile and own assignments only
-- ─────────────────────────────────────────────────────────────────────────

create policy "staff can view own record" on staff
  for select using (id = auth.uid());

create policy "staff can view own assignments" on event_assignments
  for select using (staff_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Staff: confirmed menu for events they're assigned to
-- ─────────────────────────────────────────────────────────────────────────

create policy "staff can view confirmed menu for assigned events" on booking_menu_items
  for select using (
    status = 'confirmed'
    and exists (
      select 1 from event_assignments ea
      where ea.booking_id = booking_menu_items.booking_id
        and ea.staff_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Staff: checklist for events they're assigned to.
-- Staff may only flip is_done/done_at — never edit item text or category.
-- ─────────────────────────────────────────────────────────────────────────

create policy "staff can view checklist for assigned events" on checklists
  for select using (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = checklists.booking_id
        and ea.staff_id = auth.uid()
    )
  );

create policy "staff can mark checklist items done for assigned events" on checklists
  for update using (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = checklists.booking_id
        and ea.staff_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = checklists.booking_id
        and ea.staff_id = auth.uid()
    )
  );

-- Lock column-level UPDATE access down to just completion fields
revoke update on checklists from authenticated, anon;
grant update (is_done, done_at) on checklists to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Staff: read-only view of their assigned events.
-- No client contact details, payments, contract status, or internal notes —
-- the view runs with the privileges of its owner, bypassing bookings' RLS,
-- but its WHERE clause still filters by the calling staff member's auth.uid().
-- ─────────────────────────────────────────────────────────────────────────

create view staff_event_bookings as
select
  b.id,
  b.booking_code,
  b.event_type,
  b.event_date,
  b.event_time,
  b.venue,
  b.pax,
  b.status,
  b.special_requests,
  b.menu_confirmed,
  b.service_hours,
  b.lechon_chopping,
  ea.role_for_event
from bookings b
join event_assignments ea on ea.booking_id = b.id
where ea.staff_id = auth.uid();

grant select on staff_event_bookings to authenticated;
