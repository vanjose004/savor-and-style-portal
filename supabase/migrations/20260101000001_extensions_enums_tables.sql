-- Savor and Style Catering Services — Core schema
-- Extensions, enum types, and base tables

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────

create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type menu_item_status as enum ('suggested', 'confirmed', 'rejected');
create type change_request_status as enum ('pending', 'approved', 'rejected');

-- ─────────────────────────────────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────────────────────────────────

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────

create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  client_id uuid not null references clients(id) on delete restrict,
  event_type text not null check (
    event_type in ('Birthday', 'Wedding', 'Corporate', 'Binyag/Debut/Graduation', 'Houseblessing', 'Other')
  ),
  event_date date not null,
  event_time time,
  venue text,
  pax integer,
  status booking_status not null default 'pending',
  menu_confirmed boolean not null default false,
  special_requests text,
  total_amount numeric(10, 2) not null default 0,
  reservation_fee numeric(10, 2) not null default 5000,
  balance numeric(10, 2) not null default 0,
  contract_signed boolean not null default false,
  contract_signed_at timestamptz,
  notes text,
  service_hours integer not null default 5,
  lechon_chopping boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  access_token text not null unique default encode(gen_random_bytes(16), 'hex')
);

create index idx_bookings_client_id on bookings (client_id);
create index idx_bookings_event_date on bookings (event_date);
create index idx_bookings_status on bookings (status);
create index idx_bookings_access_token on bookings (access_token);

comment on column bookings.notes is 'Internal admin notes — never exposed to the client portal.';

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKING MENU ITEMS
-- ─────────────────────────────────────────────────────────────────────────

create table booking_menu_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  dish_name text not null,
  category text not null check (
    category in ('Pork', 'Chicken', 'Pasta', 'Beef', 'Vegetable', 'Fish', 'Juice', 'Dessert')
  ),
  suggested_by text not null check (suggested_by in ('client', 'admin')),
  status menu_item_status not null default 'suggested',
  notes text
);

create index idx_booking_menu_items_booking_id on booking_menu_items (booking_id);

-- ─────────────────────────────────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  payment_type text not null check (
    payment_type in ('reservation_fee', 'downpayment', 'partial', 'balance')
  ),
  payment_method text not null check (
    payment_method in ('GCash', 'Maya', 'Cash', 'Bank Transfer', 'Credit Card', 'Check')
  ),
  reference_number text,
  credit_card_fee numeric(10, 2) not null default 0,
  paid_at timestamptz not null default now(),
  notes text,
  ar_number text,
  ar_generated boolean not null default false
);

create index idx_payments_booking_id on payments (booking_id);

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKING UPDATES (client timeline)
-- ─────────────────────────────────────────────────────────────────────────

create table booking_updates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  update_type text not null check (
    update_type in (
      'payment_update', 'menu_update', 'headcount_change',
      'general_update', 'confirmation', 'reminder', 'contract_update'
    )
  ),
  message text not null,
  internal_note text,
  created_at timestamptz not null default now(),
  created_by text
);

create index idx_booking_updates_booking_id on booking_updates (booking_id);

comment on column booking_updates.internal_note is 'Admin-only note — never exposed to the client portal.';

-- ─────────────────────────────────────────────────────────────────────────
-- CHANGE REQUESTS (from client)
-- ─────────────────────────────────────────────────────────────────────────

create table change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  request_type text not null check (
    request_type in ('menu_suggestion', 'headcount_change', 'venue_change', 'special_request', 'other')
  ),
  details text not null,
  status change_request_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  admin_response text
);

create index idx_change_requests_booking_id on change_requests (booking_id);

-- ─────────────────────────────────────────────────────────────────────────
-- STAFF (id mirrors auth.users.id for staff logins)
-- ─────────────────────────────────────────────────────────────────────────

create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('waiter', 'team_leader', 'cook', 'driver')),
  phone text,
  email text,
  is_active boolean not null default true
);

-- ─────────────────────────────────────────────────────────────────────────
-- EVENT ASSIGNMENTS
-- ─────────────────────────────────────────────────────────────────────────

create table event_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  role_for_event text,
  unique (booking_id, staff_id)
);

create index idx_event_assignments_booking_id on event_assignments (booking_id);
create index idx_event_assignments_staff_id on event_assignments (staff_id);

-- ─────────────────────────────────────────────────────────────────────────
-- CHECKLISTS
-- ─────────────────────────────────────────────────────────────────────────

create table checklists (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  item text not null,
  assigned_to uuid references staff(id) on delete set null,
  is_done boolean not null default false,
  done_at timestamptz,
  category text not null check (
    category in ('setup', 'food_prep', 'equipment', 'service', 'cleanup')
  )
);

create index idx_checklists_booking_id on checklists (booking_id);

-- ─────────────────────────────────────────────────────────────────────────
-- MENU MASTER
-- ─────────────────────────────────────────────────────────────────────────

create table menu_master (
  id uuid primary key default gen_random_uuid(),
  dish_name text not null,
  category text not null check (
    category in ('Pork', 'Chicken', 'Pasta', 'Beef', 'Vegetable', 'Fish', 'Juice', 'Dessert')
  ),
  is_available boolean not null default true,
  notes text
);

create index idx_menu_master_category on menu_master (category);
