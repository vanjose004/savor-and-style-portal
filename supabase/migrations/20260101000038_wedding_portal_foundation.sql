-- Wedding Client Portal ("My Event") — Phase 1 foundation.
--
-- A new, separate login area at /my-event/* for Wedding bookings to plan
-- their event (guest list, payments, documents, messages). This is NOT the
-- existing /booking/:access_token read-only link (ClientPortal.jsx /
-- get_booking_by_token) — that stays exactly as-is for every booking. This
-- is a persistent-session, multi-page planner, gated per booking by admin
-- ("Generate Portal Access" on the booking detail page), scoped to one
-- login per booking for now (booking_members allows multiple rows later —
-- co-planner invites are a later phase — but only one row is ever created
-- today).
--
-- Auth mirrors the existing staff username-login pattern exactly
-- (get_email_for_username / staff.username): the client logs in with their
-- booking_code + a password, resolved to a real (synthetic) Supabase Auth
-- email under the hood via get_email_for_booking_code(). Supabase Auth
-- remains the sole owner of password storage/checks.

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKING MEMBERS — one Supabase Auth login per booking (Phase 1: owner only)
-- ─────────────────────────────────────────────────────────────────────────

create table booking_members (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (booking_id, auth_user_id)
);

create index idx_booking_members_booking_id on booking_members (booking_id);
create index idx_booking_members_auth_user_id on booking_members (auth_user_id);

alter table booking_members enable row level security;

drop policy if exists "admins manage booking_members" on booking_members;
create policy "admins manage booking_members" on booking_members
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members read own membership" on booking_members;
create policy "members read own membership" on booking_members
  for select using (auth_user_id = auth.uid());

-- Used everywhere a client table needs "does the current user belong to
-- this booking" — same role is_admin()/is_staff() play for their checks.
create or replace function is_booking_member(p_booking_id uuid)
returns boolean as $$
  select exists(
    select 1 from booking_members
    where booking_id = p_booking_id and auth_user_id = auth.uid() and active
  )
$$ language sql security definer stable set search_path = public;

-- Login: resolve booking_code -> underlying Auth email, same shape as
-- get_email_for_username(). Only active memberships resolve, so a disabled
-- client account can't log in even with the right password.
create or replace function get_email_for_booking_code(p_code text)
returns text as $$
  select u.email
  from booking_members bm
  join bookings b on b.id = bm.booking_id
  join auth.users u on u.id = bm.auth_user_id
  where lower(b.booking_code) = lower(trim(p_code))
    and bm.active = true
  limit 1
$$ language sql security definer stable set search_path = public;

grant execute on function get_email_for_booking_code(text) to anon, authenticated;

-- Mirrors staff_clear_must_change_password() — members have no UPDATE
-- policy on their own booking_members row, so this narrow function is the
-- only way to flip that one column after they pick their own password.
create or replace function client_clear_must_change_password()
returns void as $$
  update booking_members set must_change_password = false where auth_user_id = auth.uid();
$$ language sql security definer set search_path = public;

grant execute on function client_clear_must_change_password() to authenticated;

-- Called once after a successful login so the admin can see "last login" on
-- the booking detail page.
create or replace function client_touch_last_login()
returns void as $$
  update booking_members set last_login_at = now() where auth_user_id = auth.uid();
$$ language sql security definer set search_path = public;

grant execute on function client_touch_last_login() to authenticated;

-- Read-only summary for the logged-in client's own booking — same idea as
-- get_booking_by_token() but resolved from auth.uid() instead of a token,
-- and deliberately excludes internal-only columns (notes, etc.).
create or replace function get_my_booking_summary()
returns table (
  id uuid,
  booking_code text,
  event_type text,
  event_date date,
  event_time time,
  venue text,
  pax integer,
  status booking_status,
  menu_confirmed boolean,
  total_amount numeric,
  reservation_fee numeric,
  balance numeric,
  client_name text
) as $$
  select
    b.id, b.booking_code, b.event_type, b.event_date, b.event_time, b.venue, b.pax,
    b.status, b.menu_confirmed, b.total_amount, b.reservation_fee, b.balance, c.name
  from bookings b
  join clients c on c.id = b.client_id
  join booking_members bm on bm.booking_id = b.id
  where bm.auth_user_id = auth.uid() and bm.active = true
  limit 1
$$ language sql security definer stable set search_path = public;

grant execute on function get_my_booking_summary() to authenticated;

-- Payment history for the logged-in client's own booking — same shape as
-- get_booking_payments_by_token(), resolved from auth.uid() instead of a
-- token. `payments` itself stays admin-only RLS (it's the accounting
-- system of record); this is the one read-only door into it for clients.
create or replace function get_my_payments()
returns table (
  id uuid,
  amount numeric,
  payment_type text,
  payment_method text,
  reference_number text,
  paid_at timestamptz,
  ar_number text
) as $$
  select p.id, p.amount, p.payment_type, p.payment_method, p.reference_number, p.paid_at, p.ar_number
  from payments p
  join booking_members bm on bm.booking_id = p.booking_id
  where bm.auth_user_id = auth.uid() and bm.active = true
  order by p.paid_at desc;
$$ language sql security definer stable set search_path = public;

grant execute on function get_my_payments() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKING PORTAL SETTINGS — admin-controlled module toggles + access state
-- ─────────────────────────────────────────────────────────────────────────

create table booking_portal_settings (
  booking_id uuid primary key references bookings(id) on delete cascade,
  modules jsonb not null default '{"guests":true,"payments":true,"documents":true,"messages":true}'::jsonb,
  extra_pax_rate numeric(10, 2),
  portal_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table booking_portal_settings enable row level security;

drop policy if exists "admins manage booking_portal_settings" on booking_portal_settings;
create policy "admins manage booking_portal_settings" on booking_portal_settings
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members read own portal settings" on booking_portal_settings;
create policy "members read own portal settings" on booking_portal_settings
  for select using (is_booking_member(booking_id));

-- Reuses the same set_updated_at() trigger function bookings already uses
-- (20260101000002_functions_triggers.sql).
drop trigger if exists booking_portal_settings_set_updated_at on booking_portal_settings;
create trigger booking_portal_settings_set_updated_at
before update on booking_portal_settings
for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- PORTAL GUESTS — the client's own guest list (full CRUD by booking members)
-- ─────────────────────────────────────────────────────────────────────────

create table portal_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  full_name text not null,
  side_group text not null default 'Others' check (
    side_group in ('Bride', 'Groom', 'Family', 'Friends', 'Work', 'VIP', 'Others')
  ),
  relationship text,
  phone text,
  rsvp_status text not null default 'not_invited' check (
    rsvp_status in ('not_invited', 'invited', 'confirmed', 'declined', 'maybe')
  ),
  meal_pref text,
  plus_one_name text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_portal_guests_booking_id on portal_guests (booking_id);

alter table portal_guests enable row level security;

drop policy if exists "booking members manage portal_guests" on portal_guests;
create policy "booking members manage portal_guests" on portal_guests
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- PAYMENT SUBMISSIONS — client uploads proof, admin verifies into `payments`
-- ─────────────────────────────────────────────────────────────────────────

create table payment_submissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  submitted_by uuid references booking_members(id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  method text not null check (method in ('GCash', 'Maya', 'Cash', 'Bank Transfer', 'Credit Card', 'Check')),
  reference_no text,
  proof_path text not null,
  status text not null default 'pending_verification' check (
    status in ('pending_verification', 'verified', 'rejected')
  ),
  reviewed_by uuid references admins(id) on delete set null,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);

create index idx_payment_submissions_booking_id on payment_submissions (booking_id);

alter table payment_submissions enable row level security;

-- Clients can submit and see their own proofs, but only admins can change
-- status/review fields — split out from a single "for all" policy on
-- purpose so a client can't mark their own submission verified.
drop policy if exists "admins manage payment_submissions" on payment_submissions;
create policy "admins manage payment_submissions" on payment_submissions
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members insert own payment_submissions" on payment_submissions;
create policy "members insert own payment_submissions" on payment_submissions
  for insert with check (is_booking_member(booking_id));

drop policy if exists "members read own payment_submissions" on payment_submissions;
create policy "members read own payment_submissions" on payment_submissions
  for select using (is_booking_member(booking_id));

-- ─────────────────────────────────────────────────────────────────────────
-- PORTAL DOCUMENTS — admin-uploaded (contracts, etc.) + client-uploaded
-- ─────────────────────────────────────────────────────────────────────────

create table portal_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  title text not null,
  file_path text not null,
  source text not null check (source in ('admin', 'client')),
  uploaded_by_member uuid references booking_members(id) on delete set null,
  uploaded_by_admin uuid references admins(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_portal_documents_booking_id on portal_documents (booking_id);

alter table portal_documents enable row level security;

drop policy if exists "admins manage portal_documents" on portal_documents;
create policy "admins manage portal_documents" on portal_documents
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members read portal_documents" on portal_documents;
create policy "members read portal_documents" on portal_documents
  for select using (is_booking_member(booking_id));

drop policy if exists "members insert own portal_documents" on portal_documents;
create policy "members insert own portal_documents" on portal_documents
  for insert with check (is_booking_member(booking_id) and source = 'client');

-- ─────────────────────────────────────────────────────────────────────────
-- PORTAL MESSAGES — one flat thread per booking (tags/attachments: later)
-- ─────────────────────────────────────────────────────────────────────────

create table portal_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  sender_member_id uuid references booking_members(id) on delete set null,
  sender_is_admin boolean not null default false,
  body text not null,
  read_by_admin boolean not null default false,
  read_by_client boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_portal_messages_booking_id on portal_messages (booking_id);

alter table portal_messages enable row level security;

drop policy if exists "admins manage portal_messages" on portal_messages;
create policy "admins manage portal_messages" on portal_messages
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members read own portal_messages" on portal_messages;
create policy "members read own portal_messages" on portal_messages
  for select using (is_booking_member(booking_id));

drop policy if exists "members insert own portal_messages" on portal_messages;
create policy "members insert own portal_messages" on portal_messages
  for insert with check (is_booking_member(booking_id) and sender_is_admin = false);

-- Narrow function (not a blanket UPDATE policy) so a client can flip
-- read_by_client on their own thread without being able to edit message
-- bodies or any other column.
create or replace function client_mark_portal_messages_read(p_booking_id uuid)
returns void as $$
  update portal_messages
  set read_by_client = true
  where booking_id = p_booking_id and read_by_client = false and is_booking_member(p_booking_id)
$$ language sql security definer set search_path = public;

grant execute on function client_mark_portal_messages_read(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- PRIVATE STORAGE — payment proofs + documents, path-scoped {booking_id}/...
-- ─────────────────────────────────────────────────────────────────────────
-- Unlike the public gallery bucket (moved to R2 for egress cost on a
-- high-traffic public page), these are low-volume, never-public files read
-- only by the booking's own members and admins — plain private Supabase
-- Storage + RLS is the right tool here, no presigned-R2 flow needed.

insert into storage.buckets (id, name, public)
values ('portal-payments', 'portal-payments', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('portal-docs', 'portal-docs', false)
on conflict (id) do nothing;

drop policy if exists "members upload own payment proofs" on storage.objects;
create policy "members upload own payment proofs" on storage.objects
  for insert
  with check (
    bucket_id = 'portal-payments'
    and is_booking_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members read own payment proofs" on storage.objects;
create policy "members read own payment proofs" on storage.objects
  for select
  using (
    bucket_id = 'portal-payments'
    and (is_booking_member(((storage.foldername(name))[1])::uuid) or is_admin())
  );

drop policy if exists "admins manage payment proofs storage" on storage.objects;
create policy "admins manage payment proofs storage" on storage.objects
  for all
  using (bucket_id = 'portal-payments' and is_admin())
  with check (bucket_id = 'portal-payments' and is_admin());

drop policy if exists "members upload own portal documents" on storage.objects;
create policy "members upload own portal documents" on storage.objects
  for insert
  with check (
    bucket_id = 'portal-docs'
    and is_booking_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members read own portal documents" on storage.objects;
create policy "members read own portal documents" on storage.objects
  for select
  using (
    bucket_id = 'portal-docs'
    and (is_booking_member(((storage.foldername(name))[1])::uuid) or is_admin())
  );

drop policy if exists "admins manage portal documents storage" on storage.objects;
create policy "admins manage portal documents storage" on storage.objects
  for all
  using (bucket_id = 'portal-docs' and is_admin())
  with check (bucket_id = 'portal-docs' and is_admin());
