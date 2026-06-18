-- Savor and Style Portal — Staff self-registration
--
-- New staff can sign up themselves at /staff/register with their own real
-- email + password. Their account is created inactive and flagged
-- `pending_approval` until an admin approves or rejects it.
--
-- `pending_approval` is a separate column from `is_active` on purpose:
-- `is_active` already has an existing, unrelated meaning (admin manually
-- deactivating a current employee, reversible via the existing "Activate"
-- button on /admin/staff). Keying the new "Pending" tab off `is_active`
-- alone would mix self-registrations in with deactivated former employees,
-- and make Reject's permanent delete reachable for the latter by mistake.

alter table staff
  add column if not exists pending_approval boolean not null default false;

comment on column staff.pending_approval is 'True only for self-registered accounts awaiting admin approval. Distinct from is_active, which is also used for manually deactivating existing staff.';

-- Lets the registration form find a free username (appending a numeric
-- suffix if the suggested one is taken) before creating the auth account,
-- so a username collision never leaves an orphaned auth user behind.
create or replace function is_username_taken(p_username text)
returns boolean as $$
  select exists (select 1 from staff where username = lower(trim(p_username)))
$$ language sql security definer stable set search_path = public;

grant execute on function is_username_taken(text) to anon, authenticated;

-- Self-registration: a newly signed-up user may insert exactly one row for
-- themselves, and only in the pending state — they can never set
-- is_active = true or pending_approval = false on their own insert.
drop policy if exists "self-registration insert" on staff;

create policy "self-registration insert" on staff
  for insert with check (
    id = auth.uid()
    and is_active = false
    and pending_approval = true
  );
