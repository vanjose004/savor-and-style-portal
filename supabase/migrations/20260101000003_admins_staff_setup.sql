-- Savor and Style Catering Services — Admin & staff role helpers
-- The `admins` table marks Supabase Auth users as business owners/admins.
-- The `staff` table (created in migration 1) marks Supabase Auth users as staff.

create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);

-- Returns true if the currently authenticated user is an admin
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admins where id = auth.uid());
$$ language sql security definer stable set search_path = public;

-- Returns true if the currently authenticated user is an active staff member
create or replace function is_staff()
returns boolean as $$
  select exists (select 1 from staff where id = auth.uid() and is_active = true);
$$ language sql security definer stable set search_path = public;
