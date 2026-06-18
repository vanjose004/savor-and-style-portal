-- Savor and Style Portal — Payroll module
--
-- Adds per-event payroll (TL-submitted, admin-approved) and bahay team daily
-- pay logging. Every approval/save auto-inserts a record into the
-- accounting tracker's `expenses` table (same Supabase project — see
-- src/utils/payrollAccounting.js, called from the admin UI).
--
-- Auth note: staff already log in via real Supabase Auth
-- (signInWithPassword), so this migration does NOT add a password_hash
-- column or any custom password storage. It only adds a `username` column
-- used to look up the underlying auth email via get_email_for_username()
-- below — Supabase Auth remains the sole owner of password storage/checks.

-- ─────────────────────────────────────────────────────────────────────────
-- staff: username login + senior-rate override
-- ─────────────────────────────────────────────────────────────────────────

alter table staff
  add column if not exists username text unique,
  add column if not exists must_change_password boolean not null default true,
  add column if not exists rate_override numeric;

comment on column staff.username is 'Login identifier staff use instead of typing their email. Resolved to an email via get_email_for_username().';
comment on column staff.rate_override is 'Per-event base pay override (e.g. senior waiter ₱900). If null, the role''s default PAYROLL_RATES value is used.';

-- Looks up the auth email for a username, so the staff login page can
-- resolve "username" -> email and then call signInWithPassword as before.
-- Supabase Auth still owns the password — this never touches it.
create or replace function get_email_for_username(p_username text)
returns text as $$
  select u.email
  from staff s
  join auth.users u on u.id = s.id
  where s.username = lower(trim(p_username))
    and s.is_active = true
$$ language sql security definer stable set search_path = public;

grant execute on function get_email_for_username(text) to anon, authenticated;

-- Staff have no UPDATE policy on their own `staff` row (only admins can
-- write to that table), so they can't flip must_change_password themselves
-- after picking a new password. This function does just that one column,
-- for the calling user's own row only — narrower and simpler than opening
-- up column-level grants that would also have to interact with the
-- admin-full-access policy on the same table.
create or replace function staff_clear_must_change_password()
returns void as $$
  update staff set must_change_password = false where id = auth.uid();
$$ language sql security definer set search_path = public;

grant execute on function staff_clear_must_change_password() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- EVENT PAYROLL REPORTS — one per event, created when a TL submits
-- ─────────────────────────────────────────────────────────────────────────

create table event_payroll_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references bookings(id) on delete cascade,
  submitted_by uuid not null references staff(id),
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  total_staff_pay numeric(10, 2) not null default 0,
  total_expenses numeric(10, 2) not null default 0,
  total_deduction numeric(10, 2) not null default 0,
  admin_notes text,
  approved_by uuid references staff(id),
  approved_at timestamptz,
  accounting_expense_id text,
  created_at timestamptz not null default now()
);

create index idx_event_payroll_reports_event_id on event_payroll_reports (event_id);
create index idx_event_payroll_reports_submitted_by on event_payroll_reports (submitted_by);
create index idx_event_payroll_reports_status on event_payroll_reports (status);

-- ─────────────────────────────────────────────────────────────────────────
-- EVENT STAFF ATTENDANCE — per staff per event, computed pay
-- ─────────────────────────────────────────────────────────────────────────

create table event_staff_attendance (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references event_payroll_reports(id) on delete cascade,
  event_id uuid not null references bookings(id) on delete cascade,
  staff_id uuid not null references staff(id),
  role_at_event text not null,
  base_rate numeric(10, 2) not null,
  ot_hours numeric(5, 2) not null default 0,
  ot_pay numeric(10, 2) not null default 0,
  total_pay numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index idx_event_staff_attendance_report_id on event_staff_attendance (report_id);
create index idx_event_staff_attendance_staff_id on event_staff_attendance (staff_id);

-- ─────────────────────────────────────────────────────────────────────────
-- EVENT EXPENSES — on-site expenses submitted by the TL with the report
-- ─────────────────────────────────────────────────────────────────────────

create table event_expenses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references event_payroll_reports(id) on delete cascade,
  event_id uuid not null references bookings(id) on delete cascade,
  submitted_by uuid not null references staff(id),
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  photo_url text,
  accounting_expense_id text,
  created_at timestamptz not null default now()
);

create index idx_event_expenses_report_id on event_expenses (report_id);

-- ─────────────────────────────────────────────────────────────────────────
-- BAHAY TEAM LOGS — admin-encoded daily pay, no TL access
-- ─────────────────────────────────────────────────────────────────────────

create table bahay_team_logs (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  worker_type text not null check (worker_type in ('labandera', 'dishwasher')),
  work_date date not null,
  daily_rate numeric(10, 2) not null,
  notes text,
  accounting_expense_id text,
  encoded_by uuid references staff(id),
  created_at timestamptz not null default now()
);

create index idx_bahay_team_logs_work_date on bahay_team_logs (work_date);

-- ─────────────────────────────────────────────────────────────────────────
-- Team roster view: lets any staff member assigned to an event see the
-- other staff assigned to that same event (name, role, rate_override) so a
-- TL can mark attendance and compute pay for the whole team. Runs as the
-- view owner (bypasses staff/event_assignments RLS), same pattern as the
-- existing staff_event_bookings view — the WHERE clause is what actually
-- restricts results to the calling staff member's shared events.
-- ─────────────────────────────────────────────────────────────────────────

create view event_team_roster as
select
  ea.booking_id as event_id,
  s.id as staff_id,
  s.name,
  s.role,
  s.rate_override,
  ea.role_for_event
from event_assignments ea
join staff s on s.id = ea.staff_id
where ea.booking_id in (
  select booking_id from event_assignments where staff_id = auth.uid()
);

grant select on event_team_roster to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────

alter table event_payroll_reports enable row level security;
alter table event_staff_attendance enable row level security;
alter table event_expenses enable row level security;
alter table bahay_team_logs enable row level security;

-- Admin: full access to every payroll table (bahay team logs are
-- intentionally admin-only — no staff policy exists for that table at all).
create policy "admins manage event_payroll_reports" on event_payroll_reports
  for all using (is_admin()) with check (is_admin());

create policy "admins manage event_staff_attendance" on event_staff_attendance
  for all using (is_admin()) with check (is_admin());

create policy "admins manage event_expenses" on event_expenses
  for all using (is_admin()) with check (is_admin());

create policy "admins manage bahay_team_logs" on bahay_team_logs
  for all using (is_admin()) with check (is_admin());

-- TL: can see and create their own reports, but never update/delete —
-- the app only ever inserts a report once, fully formed, on final submit,
-- so "no edit after submission" falls out naturally from having no UPDATE
-- policy at all.
create policy "staff view own payroll reports" on event_payroll_reports
  for select using (submitted_by = auth.uid());

-- status = 'pending' is enforced here (not just left to the column default)
-- so a report can never be inserted as already approved/rejected, bypassing
-- the admin approval step.
create policy "staff insert own payroll reports" on event_payroll_reports
  for insert with check (submitted_by = auth.uid() and status = 'pending');

create policy "staff view own report attendance" on event_staff_attendance
  for select using (
    exists (
      select 1 from event_payroll_reports r
      where r.id = report_id and r.submitted_by = auth.uid()
    )
  );

create policy "staff insert own report attendance" on event_staff_attendance
  for insert with check (
    exists (
      select 1 from event_payroll_reports r
      where r.id = report_id and r.submitted_by = auth.uid()
    )
  );

create policy "staff view own report expenses" on event_expenses
  for select using (
    exists (
      select 1 from event_payroll_reports r
      where r.id = report_id and r.submitted_by = auth.uid()
    )
  );

create policy "staff insert own report expenses" on event_expenses
  for insert with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from event_payroll_reports r
      where r.id = report_id and r.submitted_by = auth.uid()
    )
  );
