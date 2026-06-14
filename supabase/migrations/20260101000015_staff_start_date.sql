-- Add start_date to staff so admins can record each staff member's
-- employment start date, used to auto-fill the employment period on
-- Certificate of Employment (COE) documents generated from the Staff
-- Management page.

alter table staff
  add column start_date date;
