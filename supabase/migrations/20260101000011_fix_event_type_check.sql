-- Savor and Style Catering Services — Fix event_type check constraint
--
-- bookings.event_type still enforced the original event type list
-- ('Birthday', 'Wedding', 'Corporate', 'Binyag/Debut/Graduation',
-- 'Houseblessing', 'Other'), but the app's EVENT_TYPES constant was updated
-- to the new list. The old constraint is dropped first so the remapping
-- updates below (which write the new values) aren't rejected by it, then
-- existing rows with old values are remapped to their closest new
-- equivalent before the new constraint is added.

alter table bookings drop constraint bookings_event_type_check;

update bookings set event_type = 'Adult Birthday' where event_type = 'Birthday';
update bookings set event_type = 'House Blessing' where event_type = 'Houseblessing';
update bookings set event_type = 'Others' where event_type = 'Other';
update bookings set event_type = 'Debut' where event_type = 'Binyag/Debut/Graduation';

alter table bookings add constraint bookings_event_type_check check (
  event_type in (
    'Adult Birthday',
    'Debut',
    'Kiddie Party',
    'Christening/Dedication',
    'Wedding',
    'House Blessing',
    'Corporate',
    'Others'
  )
);
