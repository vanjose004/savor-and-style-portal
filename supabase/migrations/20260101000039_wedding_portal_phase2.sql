-- Wedding Client Portal ("My Event") — Phase 2: Checklist, Budget, Vendors,
-- Entourage, Program/Rundown, Menu view.
--
-- Same auth/RLS shape as Phase 1 (20260101000038): every table is scoped by
-- booking_id and gated by is_booking_member()/is_admin(). No new auth
-- primitives are needed here.
--
-- Deliberately NOT built in this migration (kept as plain application
-- logic / UI, no schema needed):
--   - The "Savor & Style" locked budget line — rendered client-side from
--     get_my_booking_summary()'s total_amount/balance, never written as a
--     portal_expenses row, so it can never drift out of sync with the real
--     booking.
--   - The "Savor & Style team" vendor listing — rendered client-side from
--     BUSINESS constants, not a portal_vendors row.
--   - Menu selection/editing — Phase 2 only adds a read-only view of the
--     existing booking_menu_items via get_my_menu_items(); an editable
--     "choose your dishes" flow depends on admin-side package rules that
--     don't exist yet (PRD open question #4, still unanswered).
--   - Templates-manager UI — Wedding template content (checklist items,
--     role names, program segments) lives in src/lib/constants.js as plain
--     JS, same as Phase 1's module-toggle defaults.

-- booking_portal_settings.modules (Phase 1) only had guests/payments/
-- documents/messages — extend its default (and backfill any already-
-- generated rows, additively, so no admin's toggle choices are reset) for
-- the six Phase 2 modules, all defaulting on.
alter table booking_portal_settings
  alter column modules set default
    '{"guests":true,"payments":true,"documents":true,"messages":true,"checklist":true,"budget":true,"vendors":true,"entourage":true,"program":true,"menu":true}'::jsonb;

update booking_portal_settings
set modules = modules
  || '{"checklist":true,"budget":true,"vendors":true,"entourage":true,"program":true,"menu":true}'::jsonb
where not (modules ?& array['checklist', 'budget', 'vendors', 'entourage', 'program', 'menu']);

-- ─────────────────────────────────────────────────────────────────────────
-- CHECKLIST & TIMELINE
-- ─────────────────────────────────────────────────────────────────────────
-- Seeded once per booking from the Wedding checklist template (in
-- constants.js) by api/portal-access.js's "generate" action — due dates are
-- computed there as event_date + offset_days at seed time, not derived by
-- a stored generated column, since the template offsets are JS, not SQL.

create table portal_checklist_tasks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  title text not null,
  description text,
  category text,
  due_date date,
  owner text not null default 'client' check (owner in ('client', 'team')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped')),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_portal_checklist_tasks_booking_id on portal_checklist_tasks (booking_id);

alter table portal_checklist_tasks enable row level security;

drop policy if exists "admins manage portal_checklist_tasks" on portal_checklist_tasks;
create policy "admins manage portal_checklist_tasks" on portal_checklist_tasks
  for all using (is_admin()) with check (is_admin());

-- Clients can see Savor team tasks (so they can watch our progress) but can
-- only create/edit/delete their own ("client"-owned) tasks — two policies,
-- OR'd together for reads, so team-task visibility doesn't also grant
-- write access to them.
drop policy if exists "members manage own client tasks" on portal_checklist_tasks;
create policy "members manage own client tasks" on portal_checklist_tasks
  for all using (is_booking_member(booking_id) and owner = 'client')
  with check (is_booking_member(booking_id) and owner = 'client');

drop policy if exists "members read team tasks" on portal_checklist_tasks;
create policy "members read team tasks" on portal_checklist_tasks
  for select using (is_booking_member(booking_id) and owner = 'team');

-- ─────────────────────────────────────────────────────────────────────────
-- BUDGET & EXPENSES
-- ─────────────────────────────────────────────────────────────────────────

create table portal_budget (
  booking_id uuid primary key references bookings(id) on delete cascade,
  total_budget numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table portal_budget enable row level security;

drop policy if exists "booking members manage portal_budget" on portal_budget;
create policy "booking members manage portal_budget" on portal_budget
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

drop trigger if exists portal_budget_set_updated_at on portal_budget;
create trigger portal_budget_set_updated_at
before update on portal_budget
for each row execute function set_updated_at();

create table portal_budget_categories (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  name text not null,
  planned_amount numeric(10, 2) not null default 0,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_portal_budget_categories_booking_id on portal_budget_categories (booking_id);

alter table portal_budget_categories enable row level security;

drop policy if exists "booking members manage portal_budget_categories" on portal_budget_categories;
create policy "booking members manage portal_budget_categories" on portal_budget_categories
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

create table portal_vendors (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  category text,
  name text not null,
  contact_person text,
  phone text,
  fb_page text,
  email text,
  contract_amount numeric(10, 2),
  status text not null default 'inquiry' check (status in ('inquiry', 'booked', 'confirmed')),
  call_time text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_portal_vendors_booking_id on portal_vendors (booking_id);

alter table portal_vendors enable row level security;

drop policy if exists "booking members manage portal_vendors" on portal_vendors;
create policy "booking members manage portal_vendors" on portal_vendors
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

create table portal_expenses (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  category_id uuid references portal_budget_categories(id) on delete set null,
  vendor_id uuid references portal_vendors(id) on delete set null,
  item text not null,
  estimated numeric(10, 2),
  actual numeric(10, 2),
  paid numeric(10, 2) not null default 0,
  due_date date,
  method text,
  status text not null default 'planned' check (status in ('planned', 'booked', 'partially_paid', 'fully_paid')),
  receipt_path text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_portal_expenses_booking_id on portal_expenses (booking_id);

alter table portal_expenses enable row level security;

drop policy if exists "booking members manage portal_expenses" on portal_expenses;
create policy "booking members manage portal_expenses" on portal_expenses
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- ENTOURAGE / ROLES
-- ─────────────────────────────────────────────────────────────────────────

create table portal_event_roles (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  role_group text not null,
  role_name text not null,
  person_name text,
  contact text,
  attire text,
  confirmed boolean not null default false,
  sequence integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_portal_event_roles_booking_id on portal_event_roles (booking_id);

alter table portal_event_roles enable row level security;

drop policy if exists "booking members manage portal_event_roles" on portal_event_roles;
create policy "booking members manage portal_event_roles" on portal_event_roles
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- PROGRAM / RUNDOWN
-- ─────────────────────────────────────────────────────────────────────────

create table portal_program_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  start_time time,
  duration_min integer not null default 10,
  segment text not null,
  people text,
  song text,
  responsible text not null default 'client' check (
    responsible in ('client', 'host', 'savor_team', 'coordinator')
  ),
  notes text,
  sort integer not null default 0,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_portal_program_items_booking_id on portal_program_items (booking_id);

alter table portal_program_items enable row level security;

-- Clients can draft/reorder freely, but "approved" is review-locked — and
-- split into one policy per action (not a single "for all") because DELETE
-- has no WITH CHECK clause: a combined policy whose USING only tested
-- is_booking_member() would let a member delete an already-admin-approved
-- row, even though UPDATE/INSERT on that same row would correctly be
-- blocked by WITH CHECK. Read access stays broad (any row in their own
-- booking, approved or not) so they can still see the final rundown.
drop policy if exists "admins manage portal_program_items" on portal_program_items;
create policy "admins manage portal_program_items" on portal_program_items
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members manage unapproved portal_program_items" on portal_program_items;

drop policy if exists "members read portal_program_items" on portal_program_items;
create policy "members read portal_program_items" on portal_program_items
  for select using (is_booking_member(booking_id));

drop policy if exists "members insert own portal_program_items" on portal_program_items;
create policy "members insert own portal_program_items" on portal_program_items
  for insert with check (is_booking_member(booking_id) and approved = false);

drop policy if exists "members update own unapproved portal_program_items" on portal_program_items;
create policy "members update own unapproved portal_program_items" on portal_program_items
  for update using (is_booking_member(booking_id) and approved = false)
  with check (is_booking_member(booking_id) and approved = false);

drop policy if exists "members delete own unapproved portal_program_items" on portal_program_items;
create policy "members delete own unapproved portal_program_items" on portal_program_items
  for delete using (is_booking_member(booking_id) and approved = false);

-- ─────────────────────────────────────────────────────────────────────────
-- MENU (read-only view of the existing booking_menu_items for the client)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function get_my_menu_items()
returns table (
  id uuid,
  dish_name text,
  category text,
  status menu_item_status,
  suggested_by text
) as $$
  select bmi.id, bmi.dish_name, bmi.category, bmi.status, bmi.suggested_by
  from booking_menu_items bmi
  join booking_members bm on bm.booking_id = bmi.booking_id
  where bm.auth_user_id = auth.uid() and bm.active = true
  order by bmi.category, bmi.dish_name;
$$ language sql security definer stable set search_path = public;

grant execute on function get_my_menu_items() to authenticated;
