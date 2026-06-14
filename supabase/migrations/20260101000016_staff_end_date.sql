-- Add end_date to staff so admins can record each staff member's
-- employment end date, used on Certificate of Employment (COE) documents
-- to state a definite employment period instead of "to present".

alter table staff
  add column end_date date;
