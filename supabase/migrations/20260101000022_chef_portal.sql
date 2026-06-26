-- Savor and Style Catering Services — Chef Portal
-- Chef accounts are created manually in the Supabase dashboard (Auth > Users)
-- with user metadata { "role": "chef" } — no dedicated chefs table. is_chef()
-- reads that role straight off the request JWT.

create or replace function is_chef()
returns boolean as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'chef', false);
$$ language sql stable;

-- ─────────────────────────────────────────────────────────────────────────
-- Chef: read-only view of confirmed bookings.
-- No client contact details, payments, contract status, or internal notes —
-- the view runs with the privileges of its owner, bypassing bookings' RLS,
-- so the is_chef() check below is what actually gates access.
-- ─────────────────────────────────────────────────────────────────────────

create or replace view chef_confirmed_bookings as
select
  b.id,
  b.booking_code,
  b.event_type,
  b.event_date,
  b.event_time,
  b.venue,
  b.pax,
  b.special_requests,
  c.name as client_name
from bookings b
join clients c on c.id = b.client_id
where b.status = 'confirmed'
  and is_chef();

grant select on chef_confirmed_bookings to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Chef: confirmed menu items for confirmed bookings (for the Kitchen Order
-- Sheet). This is a real RLS policy on the table itself, additive alongside
-- the existing admin/staff policies.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "chef can view confirmed menu for confirmed bookings" on booking_menu_items;

create policy "chef can view confirmed menu for confirmed bookings" on booking_menu_items
  for select using (
    is_chef()
    and status = 'confirmed'
    and exists (
      select 1 from bookings b
      where b.id = booking_menu_items.booking_id
        and b.status = 'confirmed'
    )
  );
