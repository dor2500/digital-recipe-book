import { localRepository } from "./local";
import type { RecipeRepository } from "./types";

export type { RecipeRepository } from "./types";

let cached: Promise<RecipeRepository> | null = null;

/**
 * Picks the backend from environment variables. Supabase is loaded lazily so
 * the offline build never ships its client.
 */
export function getRecipeRepository(): Promise<RecipeRepository> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "recipe-images";

  cached =
    url && key
      ? import("./supabase").then((m) => m.createSupabaseRepository(url, key, bucket))
      : Promise.resolve(localRepository);

  return cached;
}
