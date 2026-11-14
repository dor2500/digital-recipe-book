-- Adds the sections תוספות (Sides), לחמים (Breads) and מאפים (Baking).
-- Run once in the Supabase SQL editor on a project created with the older schema.sql.

alter table public.recipes drop constraint if exists recipes_category_check;
alter table public.recipes add constraint recipes_category_check
  check (category in ('Breakfast', 'Mains', 'Sides', 'Breads', 'Baking', 'Vegan', 'Desserts'));
