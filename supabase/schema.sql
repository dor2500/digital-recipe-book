-- Run in the Supabase SQL editor, then set NEXT_PUBLIC_SUPABASE_URL and
-- NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.
--
-- Also turn on: Authentication → Sign In / Providers → "Allow anonymous sign-ins".
-- Every visitor gets an anonymous user id. It marks who uploaded each recipe,
-- and only that user can edit or delete it.

create table if not exists public.recipes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 120),
  author       text not null check (char_length(author) between 1 and 80),
  category     text not null check (category in ('Breakfast', 'Mains', 'Vegan', 'Desserts')),
  prep_time    integer not null default 0 check (prep_time >= 0),
  cook_time    integer not null default 0 check (cook_time >= 0),
  servings     integer not null default 1 check (servings > 0),
  image_url    text,
  description  text,
  ingredients  jsonb not null default '[]'::jsonb,
  steps        jsonb not null default '[]'::jsonb,
  chefs_notes  text,
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

alter table public.recipes enable row level security;

-- Anyone can read the book.
create policy "recipes are public" on public.recipes
  for select using (true);

-- Signed-in visitors (anonymous users count) add recipes as themselves.
create policy "add your own recipe" on public.recipes
  for insert to authenticated with check (owner_id = auth.uid());

-- Only the uploader can change or delete a recipe.
create policy "edit your own recipe" on public.recipes
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "delete your own recipe" on public.recipes
  for delete to authenticated using (owner_id = auth.uid());

-- Public bucket for recipe photos. Each user uploads into a folder named by their id.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

create policy "recipe images are public" on storage.objects
  for select using (bucket_id = 'recipe-images');

create policy "upload into your own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
