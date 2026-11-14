-- Run in the Supabase SQL editor, then set NEXT_PUBLIC_SUPABASE_URL and
-- NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.

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
  ingredients  jsonb not null default '[]'::jsonb,  -- [{ "quantity": "2 cups", "name": "flour" }]
  steps        jsonb not null default '[]'::jsonb,  -- ["Step one", "Step two"]
  chefs_notes  text,
  created_at   timestamptz not null default now()
);

alter table public.recipes enable row level security;

-- Anyone can read the book.
create policy "recipes are public" on public.recipes
  for select using (true);

-- Anyone can add a page. Tighten this (e.g. `to authenticated`) before
-- opening the site to the public internet.
create policy "anyone can add a recipe" on public.recipes
  for insert with check (true);

-- Public bucket for recipe photos.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

create policy "recipe images are public" on storage.objects
  for select using (bucket_id = 'recipe-images');

create policy "anyone can upload a recipe image" on storage.objects
  for insert with check (bucket_id = 'recipe-images');
