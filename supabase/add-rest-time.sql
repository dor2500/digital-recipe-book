-- Adds the waiting time a recipe can have: rising (breads, pizza), resting
-- (pasta dough, pastry), chilling (desserts) or fermenting (drinks).
-- Run once in the Supabase SQL editor. Safe to run again.

alter table public.recipes
  add column if not exists rest_time integer not null default 0 check (rest_time >= 0);

-- Make the API notice the new column right away.
notify pgrst, 'reload schema';
