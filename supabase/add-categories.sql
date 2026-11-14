-- Lets the database accept every section in the book (13 sections).
-- Run in the Supabase SQL editor whenever sections are added. Safe to run again.

alter table public.recipes drop constraint if exists recipes_category_check;
alter table public.recipes add constraint recipes_category_check
  check (category in ('Breakfast', 'Starters', 'Soups', 'Mains', 'Pizza', 'Pasta', 'Sides', 'Sauces', 'Breads', 'Baking', 'Vegan', 'Desserts', 'Drinks'));
