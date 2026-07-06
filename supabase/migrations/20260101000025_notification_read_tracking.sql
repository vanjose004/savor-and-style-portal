-- Read-tracking for the admin notification bell.
--
-- The bell surfaces two kinds of client-submitted notifications:
--   - change_requests (update requests submitted from the client portal)
--   - booking_menu_items where suggested_by = 'client' (menu change requests)
--
-- Neither table tracked whether an admin had already seen/opened a given
-- request, so there was no way to compute an "unread" badge count or mark
-- an item as read when clicked.

alter table change_requests add column if not exists is_read boolean not null default false;
alter table booking_menu_items add column if not exists is_read boolean not null default false;

create index if not exists idx_change_requests_is_read on change_requests (is_read);
create index if not exists idx_booking_menu_items_is_read on booking_menu_items (is_read);
