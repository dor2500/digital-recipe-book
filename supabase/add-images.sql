-- Lets a recipe have several photos. Run once in the Supabase SQL editor.
-- Safe to run again. Existing recipes keep their photo as the first one.

alter table public.recipes
  add column if not exists images jsonb not null default '[]'::jsonb;

update public.recipes
set images = jsonb_build_array(image_url)
where image_url is not null and images = '[]'::jsonb;

-- Make the API notice the new column right away.
notify pgrst, 'reload schema';
