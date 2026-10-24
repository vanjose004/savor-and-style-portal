-- Driver portal — a read-only schedule of every upcoming/past event, for
-- staff with role = 'driver'.
--
-- The existing `staff` table/role system already supports 'driver' (see
-- STAFF_ROLES in constants.js and the "Add Staff" flow in
-- StaffFormModal.jsx) — this migration only adds what's new: a role-gated
-- view exposing ALL bookings (not assignment-scoped like the existing
-- staff_event_bookings view, since a driver needs to see every upcoming
-- trip, not just ones they're personally assigned to) with the extra
-- fields a driver actually needs (client contact, full venue address) but
-- none of the financial ones.
--
-- Same security model as staff_event_bookings: the view is owned by the
-- migration role, which bypasses bookings'/clients' RLS when queried
-- through the view — so the authorization check has to live inside the
-- view's own WHERE clause instead. Here that's a flat is_driver() guard
-- (same column set for every row, unlike staff_event_bookings' per-row
-- "is this staff member assigned to this specific booking" join) — a
-- non-driver querying this view gets zero rows, full stop. This is the
-- real security boundary; the UI/routing restrictions are just UX on top
-- of it, not what's actually keeping financial columns out of reach.

create or replace function is_driver()
returns boolean as $$
  select exists(
    select 1 from staff where id = auth.uid() and role = 'driver' and is_active = true
  )
$$ language sql security definer stable set search_path = public;

create view driver_event_schedule as
select
  b.id,
  b.booking_code,
  b.event_type,
  b.event_date,
  b.event_time,
  b.service_hours,
  b.venue,
  b.venue_contact_number,
  b.venue_pin_location,
  b.venue_access_time,
  b.pax,
  b.status,
  b.special_requests,
  b.freebies,
  b.lechon_chopping,
  c.name as client_name,
  c.phone as client_phone
from bookings b
join clients c on c.id = b.client_id
where is_driver() and b.status != 'cancelled';

grant select on driver_event_schedule to authenticated;
