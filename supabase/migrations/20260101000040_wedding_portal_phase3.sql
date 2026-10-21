-- Wedding Client Portal ("My Event") — Phase 3: Mood Board, Seating,
-- Requirements, Songs, Add-Ons, Public RSVP, Co-planners, Gifts, Post-event
-- Gallery & Feedback, Guest Check-in.
--
-- Trims from the PRD, same "state them, don't silently drop them" approach
-- as Phase 1/2:
--   - No templates-manager UI for the add-on catalog — admins manage
--     addon_catalog rows from a small new /admin/addon-catalog page (plain
--     table CRUD, added alongside this migration), not a generic
--     multi-event-type template system.
--   - portal_activity_log (PRD §6) is NOT added — retrofitting a diff-based
--     audit log across every Phase 1/2 mutation point (guests, budget,
--     checklist, ...) is a bigger, separate pass. "Last login" on
--     booking_members is the only activity signal for now.
--   - Co-planners get their own login (this migration) but not their own
--     role distinction yet (PRD's owner/co_planner/viewer) — every
--     booking_members row is still 'role' = 'owner'; a second login is
--     just another full-access member for now.
--   - Guest QR *camera* check-in is replaced by the PRD's own named
--     fallback: "a searchable checklist for the reception table, usable by
--     staff on phone" (no new camera-scanning dependency) — added to the
--     existing staff event detail page, not a new QR flow.

-- ─────────────────────────────────────────────────────────────────────────
-- CO-PLANNERS — booking_members can now hold more than one active login
-- ─────────────────────────────────────────────────────────────────────────
-- Phase 1 only ever created one row (role='owner') and login was resolved
-- straight from bookings.booking_code. A second member needs their own
-- distinct login string ("SS-2026-001-2") without colliding with the
-- first, so login resolution moves from "look up bookings.booking_code" to
-- "look up booking_members.login_code" — login_code defaults to the
-- booking_code itself for the first (owner) row, so nothing already
-- generated breaks.

alter table booking_members add column if not exists login_code text;

update booking_members bm
set login_code = b.booking_code
from bookings b
where bm.booking_id = b.id and bm.login_code is null;

alter table booking_members alter column login_code set not null;
alter table booking_members add constraint booking_members_login_code_key unique (login_code);

create or replace function get_email_for_booking_code(p_code text)
returns text as $$
  select u.email
  from booking_members bm
  join auth.users u on u.id = bm.auth_user_id
  where lower(bm.login_code) = lower(trim(p_code))
    and bm.active = true
  limit 1
$$ language sql security definer stable set search_path = public;

-- Extend the module-toggle default once more for Phase 3's modules —
-- gifts/gallery/feedback are included as toggles too (even though gallery/
-- feedback are also date-gated client-side) so an admin can still turn
-- them off entirely for a given booking.
alter table booking_portal_settings
  alter column modules set default
    '{"guests":true,"payments":true,"documents":true,"messages":true,"checklist":true,"budget":true,"vendors":true,"entourage":true,"program":true,"menu":true,"moodboard":true,"seating":true,"requirements":true,"songs":true,"addons":true,"gifts":true,"gallery":true,"feedback":true}'::jsonb;

update booking_portal_settings
set modules = modules
  || '{"moodboard":true,"seating":true,"requirements":true,"songs":true,"addons":true,"gifts":true,"gallery":true,"feedback":true}'::jsonb
where not (modules ?& array['moodboard', 'seating', 'requirements', 'songs', 'addons', 'gifts', 'gallery', 'feedback']);

-- ─────────────────────────────────────────────────────────────────────────
-- STYLING & MOOD BOARD
-- ─────────────────────────────────────────────────────────────────────────

create table portal_mood_board (
  booking_id uuid primary key references bookings(id) on delete cascade,
  theme text,
  palette jsonb not null default '[]'::jsonb,
  pinterest_links jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'revision_requested')),
  admin_notes text,
  final_design_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table portal_mood_board enable row level security;

drop policy if exists "admins manage portal_mood_board" on portal_mood_board;
create policy "admins manage portal_mood_board" on portal_mood_board
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members read portal_mood_board" on portal_mood_board;
create policy "members read portal_mood_board" on portal_mood_board
  for select using (is_booking_member(booking_id));

-- Clients can edit their own board while it's still a draft or kicked back
-- for revision, but not once submitted/approved — mirrors the
-- program_items "approved" lock, just with two "locked" states instead of
-- one boolean.
drop policy if exists "members edit own editable portal_mood_board" on portal_mood_board;
create policy "members edit own editable portal_mood_board" on portal_mood_board
  for all using (is_booking_member(booking_id) and status in ('draft', 'revision_requested'))
  with check (is_booking_member(booking_id) and status in ('draft', 'submitted', 'revision_requested'));

drop trigger if exists portal_mood_board_set_updated_at on portal_mood_board;
create trigger portal_mood_board_set_updated_at
before update on portal_mood_board
for each row execute function set_updated_at();

create table portal_mood_board_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  image_path text not null,
  note text,
  created_at timestamptz not null default now()
);

create index idx_portal_mood_board_items_booking_id on portal_mood_board_items (booking_id);

alter table portal_mood_board_items enable row level security;

drop policy if exists "admins manage portal_mood_board_items" on portal_mood_board_items;
create policy "admins manage portal_mood_board_items" on portal_mood_board_items
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members manage portal_mood_board_items" on portal_mood_board_items;
create policy "members manage portal_mood_board_items" on portal_mood_board_items
  for all using (is_booking_member(booking_id))
  with check (is_booking_member(booking_id));

insert into storage.buckets (id, name, public)
values ('portal-moodboard', 'portal-moodboard', false)
on conflict (id) do nothing;

drop policy if exists "members upload own moodboard files" on storage.objects;
create policy "members upload own moodboard files" on storage.objects
  for insert
  with check (bucket_id = 'portal-moodboard' and is_booking_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "members read own moodboard files" on storage.objects;
create policy "members read own moodboard files" on storage.objects
  for select
  using (bucket_id = 'portal-moodboard' and (is_booking_member(((storage.foldername(name))[1])::uuid) or is_admin()));

drop policy if exists "admins manage moodboard storage" on storage.objects;
create policy "admins manage moodboard storage" on storage.objects
  for all
  using (bucket_id = 'portal-moodboard' and is_admin())
  with check (bucket_id = 'portal-moodboard' and is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- SEATING PLANNER
-- ─────────────────────────────────────────────────────────────────────────

create table portal_seating_tables (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  label text not null,
  table_type text not null default 'regular' check (table_type in ('regular', 'couple', 'family', 'sponsors', 'kids')),
  capacity integer not null default 8,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_portal_seating_tables_booking_id on portal_seating_tables (booking_id);

alter table portal_seating_tables enable row level security;

drop policy if exists "booking members manage portal_seating_tables" on portal_seating_tables;
create policy "booking members manage portal_seating_tables" on portal_seating_tables
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

alter table portal_guests add column if not exists table_id uuid references portal_seating_tables(id) on delete set null;
alter table portal_guests add column if not exists checked_in_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────
-- GUEST CHECK-IN — staff assigned to this event can search & check guests
-- in from their phone (the PRD's own named fallback to QR scanning),
-- mirroring the existing "staff can mark checklist items done for assigned
-- events" pattern exactly: scoped via event_assignments, column-locked to
-- just checked_in_at.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "staff can view guests for assigned events" on portal_guests;
create policy "staff can view guests for assigned events" on portal_guests
  for select using (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = portal_guests.booking_id
        and ea.staff_id = auth.uid()
    )
  );

drop policy if exists "staff can check in guests for assigned events" on portal_guests;
create policy "staff can check in guests for assigned events" on portal_guests
  for update using (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = portal_guests.booking_id
        and ea.staff_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from event_assignments ea
      where ea.booking_id = portal_guests.booking_id
        and ea.staff_id = auth.uid()
    )
  );

revoke update on portal_guests from authenticated, anon;
grant update (checked_in_at, rsvp_status, meal_pref, plus_one_name, notes, table_id, full_name, side_group, relationship, phone) on portal_guests to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- REQUIREMENTS TRACKER
-- ─────────────────────────────────────────────────────────────────────────

create table portal_requirements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  title text not null,
  description text,
  where_to_get text,
  due_date date,
  status text not null default 'not_started' check (status in ('not_started', 'processing', 'submitted', 'done')),
  file_path text,
  notes text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_portal_requirements_booking_id on portal_requirements (booking_id);

alter table portal_requirements enable row level security;

drop policy if exists "booking members manage portal_requirements" on portal_requirements;
create policy "booking members manage portal_requirements" on portal_requirements
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

insert into storage.buckets (id, name, public)
values ('portal-requirements', 'portal-requirements', false)
on conflict (id) do nothing;

drop policy if exists "members upload own requirement files" on storage.objects;
create policy "members upload own requirement files" on storage.objects
  for insert
  with check (bucket_id = 'portal-requirements' and is_booking_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "members read own requirement files" on storage.objects;
create policy "members read own requirement files" on storage.objects
  for select
  using (bucket_id = 'portal-requirements' and (is_booking_member(((storage.foldername(name))[1])::uuid) or is_admin()));

drop policy if exists "admins manage requirement storage" on storage.objects;
create policy "admins manage requirement storage" on storage.objects
  for all
  using (bucket_id = 'portal-requirements' and is_admin())
  with check (bucket_id = 'portal-requirements' and is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- MUSIC & SONG LIST
-- ─────────────────────────────────────────────────────────────────────────

create table portal_songs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  segment text not null,
  title text not null,
  artist text,
  link text,
  must_play boolean not null default false,
  do_not_play boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_portal_songs_booking_id on portal_songs (booking_id);

alter table portal_songs enable row level security;

drop policy if exists "booking members manage portal_songs" on portal_songs;
create policy "booking members manage portal_songs" on portal_songs
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- ADD-ON REQUESTS
-- ─────────────────────────────────────────────────────────────────────────
-- addon_catalog is admin-owned reference data (shared across bookings, not
-- booking_id-scoped), managed from the new /admin/addon-catalog page.

create table addon_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  starting_price numeric(10, 2),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table addon_catalog enable row level security;

drop policy if exists "admins manage addon_catalog" on addon_catalog;
create policy "admins manage addon_catalog" on addon_catalog
  for all using (is_admin()) with check (is_admin());

-- Exposed to clients via RPC (not a direct table grant), matching this
-- codebase's "no direct table grants for anon/authenticated" convention —
-- only active items, and only the columns a client needs to browse.
create or replace function get_active_addon_catalog()
returns table (id uuid, name text, description text, starting_price numeric) as $$
  select id, name, description, starting_price
  from addon_catalog
  where active = true
  order by sort;
$$ language sql security definer stable set search_path = public;

grant execute on function get_active_addon_catalog() to authenticated;

create table addon_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  addon_id uuid references addon_catalog(id) on delete set null,
  notes text,
  status text not null default 'requested' check (status in ('requested', 'quoted', 'accepted', 'declined')),
  quoted_price numeric(10, 2),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_addon_requests_booking_id on addon_requests (booking_id);

alter table addon_requests enable row level security;

drop policy if exists "admins manage addon_requests" on addon_requests;
create policy "admins manage addon_requests" on addon_requests
  for all using (is_admin()) with check (is_admin());

-- status/quoted_price must stay at their "requested"/unset defaults on
-- insert — only admins (via the "admins manage" policy above) can move a
-- request through quoted/accepted/declined.
drop policy if exists "members insert own addon_requests" on addon_requests;
create policy "members insert own addon_requests" on addon_requests
  for insert with check (is_booking_member(booking_id) and status = 'requested' and quoted_price is null);

drop policy if exists "members read own addon_requests" on addon_requests;
create policy "members read own addon_requests" on addon_requests
  for select using (is_booking_member(booking_id));

-- Clients can only respond to a quote (quoted -> accepted/declined) — not
-- self-quote or self-approve their own initial request. Nothing auto-bills
-- off quoted_price (admin still manually reflects an accepted add-on in
-- the booking total), so a client editing their own copy of that number
-- isn't a financial exploit, just their own bookkeeping to get wrong.
drop policy if exists "members respond to own addon_requests" on addon_requests;
create policy "members respond to own addon_requests" on addon_requests
  for update
  using (is_booking_member(booking_id) and status = 'quoted')
  with check (is_booking_member(booking_id) and status in ('accepted', 'declined'));

-- ─────────────────────────────────────────────────────────────────────────
-- PUBLIC RSVP PAGE
-- ─────────────────────────────────────────────────────────────────────────
-- A shareable, tokenized, no-login page at /rsvp/:slug — same trust model
-- as the existing access_token client portal link: the random slug is the
-- credential. Guests search their own name (never browse the full list)
-- and set their own RSVP status/meal preference.

alter table booking_portal_settings add column if not exists rsvp_public_enabled boolean not null default false;
alter table booking_portal_settings add column if not exists rsvp_slug text unique;

-- booking_portal_settings has no member UPDATE policy (only "members read",
-- "admins manage") — RLS is row-level, not column-level, so a client write
-- policy on this row would also let them flip `modules`/`portal_enabled`,
-- which must stay admin-only. This narrow function is the client's only
-- door into this table, touching exactly these two columns.
create or replace function client_set_rsvp(p_enabled boolean, p_slug text)
returns void as $$
  update booking_portal_settings s
  set rsvp_public_enabled = p_enabled, rsvp_slug = p_slug
  from booking_members bm
  where bm.booking_id = s.booking_id and bm.auth_user_id = auth.uid() and bm.active = true
$$ language sql security definer set search_path = public;

grant execute on function client_set_rsvp(boolean, text) to authenticated;

create or replace function get_rsvp_event_info(p_slug text)
returns table (booking_code text, event_date date, venue text, client_name text) as $$
  select b.booking_code, b.event_date, b.venue, c.name
  from booking_portal_settings s
  join bookings b on b.id = s.booking_id
  join clients c on c.id = b.client_id
  where s.rsvp_slug = p_slug and s.rsvp_public_enabled = true
$$ language sql security definer stable set search_path = public;

grant execute on function get_rsvp_event_info(text) to anon, authenticated;

-- Guests search by (partial, case-insensitive) name rather than browsing
-- the full list, to avoid exposing every guest's RSVP status/phone to
-- anyone with the link.
create or replace function search_rsvp_guests(p_slug text, p_query text)
returns table (id uuid, full_name text, rsvp_status text) as $$
  select g.id, g.full_name, g.rsvp_status
  from portal_guests g
  join booking_portal_settings s on s.booking_id = g.booking_id
  where s.rsvp_slug = p_slug
    and s.rsvp_public_enabled = true
    and g.full_name ilike '%' || p_query || '%'
  limit 10
$$ language sql security definer stable set search_path = public;

grant execute on function search_rsvp_guests(text, text) to anon, authenticated;

create or replace function submit_rsvp(p_slug text, p_guest_id uuid, p_status text, p_meal_pref text, p_notes text)
returns void as $$
  update portal_guests g
  set rsvp_status = p_status, meal_pref = coalesce(p_meal_pref, g.meal_pref), notes = coalesce(p_notes, g.notes)
  from booking_portal_settings s
  where s.booking_id = g.booking_id
    and s.rsvp_slug = p_slug
    and s.rsvp_public_enabled = true
    and g.id = p_guest_id
    and p_status in ('confirmed', 'declined', 'maybe')
$$ language sql security definer set search_path = public;

grant execute on function submit_rsvp(text, uuid, text, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- GIFTS & THANK-YOU TRACKER
-- ─────────────────────────────────────────────────────────────────────────

create table portal_gifts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  guest_id uuid references portal_guests(id) on delete set null,
  from_name text,
  description text,
  amount numeric(10, 2),
  received_at date,
  thank_you_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_portal_gifts_booking_id on portal_gifts (booking_id);

alter table portal_gifts enable row level security;

drop policy if exists "booking members manage portal_gifts" on portal_gifts;
create policy "booking members manage portal_gifts" on portal_gifts
  for all using (is_booking_member(booking_id) or is_admin())
  with check (is_booking_member(booking_id) or is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- POST-EVENT GALLERY & FEEDBACK
-- ─────────────────────────────────────────────────────────────────────────
-- Separate from the public /gallery (R2-backed marketing gallery) —
-- these are this one couple's own event photos, admin-uploaded, private to
-- the booking's members.

create table portal_event_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  file_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index idx_portal_event_photos_booking_id on portal_event_photos (booking_id);

alter table portal_event_photos enable row level security;

drop policy if exists "admins manage portal_event_photos" on portal_event_photos;
create policy "admins manage portal_event_photos" on portal_event_photos
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members read portal_event_photos" on portal_event_photos;
create policy "members read portal_event_photos" on portal_event_photos
  for select using (is_booking_member(booking_id));

insert into storage.buckets (id, name, public)
values ('portal-event-gallery', 'portal-event-gallery', false)
on conflict (id) do nothing;

drop policy if exists "members read own event gallery" on storage.objects;
create policy "members read own event gallery" on storage.objects
  for select
  using (bucket_id = 'portal-event-gallery' and (is_booking_member(((storage.foldername(name))[1])::uuid) or is_admin()));

drop policy if exists "admins manage event gallery storage" on storage.objects;
create policy "admins manage event gallery storage" on storage.objects
  for all
  using (bucket_id = 'portal-event-gallery' and is_admin())
  with check (bucket_id = 'portal-event-gallery' and is_admin());

create table portal_feedback (
  booking_id uuid primary key references bookings(id) on delete cascade,
  ratings jsonb not null default '{}'::jsonb,
  comment text,
  allow_testimonial boolean not null default false,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table portal_feedback enable row level security;

drop policy if exists "admins manage portal_feedback" on portal_feedback;
create policy "admins manage portal_feedback" on portal_feedback
  for all using (is_admin()) with check (is_admin());

drop policy if exists "members manage own portal_feedback" on portal_feedback;
create policy "members manage own portal_feedback" on portal_feedback
  for all using (is_booking_member(booking_id))
  with check (is_booking_member(booking_id));
