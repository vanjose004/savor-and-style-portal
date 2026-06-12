-- Savor and Style Catering Services — Kids category for the main menu
--
-- Adds a "Kids" menu category so non-food Kids Menu items (e.g. Kiddie
-- Tables and Chairs) can be filed in a booking's menu alongside the food
-- categories, and seeds menu_master with the Kids Menu dishes that aren't
-- already in the catalog (Fried Chicken, Juice, Kiddie Tables and Chairs) so
-- admins can manage them via Edit Menu / Menu Manager.

alter table booking_menu_items drop constraint booking_menu_items_category_check;
alter table booking_menu_items add constraint booking_menu_items_category_check
  check (category in ('Pork', 'Chicken', 'Pasta', 'Beef', 'Vegetable', 'Fish', 'Juice', 'Dessert', 'Kids'));

alter table menu_master drop constraint menu_master_category_check;
alter table menu_master add constraint menu_master_category_check
  check (category in ('Pork', 'Chicken', 'Pasta', 'Beef', 'Vegetable', 'Fish', 'Juice', 'Dessert', 'Kids'));

insert into menu_master (dish_name, category) values
  ('Fried Chicken', 'Chicken'),
  ('Juice', 'Juice'),
  ('Kiddie Tables and Chairs', 'Kids');
