-- Savor and Style Portal — fix admin-set FK columns pointing at the wrong table
--
-- event_payroll_reports.approved_by and bahay_team_logs.encoded_by are only
-- ever written by an admin (see "admins manage event_payroll_reports" /
-- "admins manage bahay_team_logs" policies in migration 17 — both admin-only
-- tables). But both columns were declared `references staff(id)`. Admins
-- live in the separate `admins` table (migration 3) with their own
-- auth.users-backed id, so an admin's auth.uid() is never a row in `staff`,
-- and the insert/update fails its foreign key check. Point both columns at
-- admins(id) instead, which is what they actually store.

alter table event_payroll_reports
  drop constraint event_payroll_reports_approved_by_fkey,
  add constraint event_payroll_reports_approved_by_fkey
    foreign key (approved_by) references admins(id);

alter table bahay_team_logs
  drop constraint bahay_team_logs_encoded_by_fkey,
  add constraint bahay_team_logs_encoded_by_fkey
    foreign key (encoded_by) references admins(id);
