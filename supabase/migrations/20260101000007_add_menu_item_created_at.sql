-- Add created_at to booking_menu_items so client menu suggestions can be
-- sorted/merged chronologically with bookings, payments, and change requests
-- on the Admin Dashboard activity feed.

alter table booking_menu_items
  add column created_at timestamptz not null default now();
