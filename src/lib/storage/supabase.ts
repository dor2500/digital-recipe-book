import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NewRecipe, Recipe } from "@/lib/types";
import type { RecipeRepository } from "./types";

/** Row shape of the `recipes` table (snake_case, see supabase/schema.sql). */
interface RecipeRow {
  id: string;
  title: string;
  author: string;
  category: Recipe["category"];
  prep_time: number;
  cook_time: number;
  servings: number;
  image_url: string | null;
  description: string | null;
  ingredients: Recipe["ingredients"];
  steps: string[];
  chefs_notes: string | null;
  created_at: string;
}

const fromRow = (r: RecipeRow): Recipe => ({
  id: r.id,
  title: r.title,
  author: r.author,
  category: r.category,
  prepTime: r.prep_time,
  cookTime: r.cook_time,
  servings: r.servings,
  imageUrl: r.image_url ?? undefined,
  description: r.description ?? undefined,
  ingredients: r.ingredients,
  steps: r.steps,
  chefsNotes: r.chefs_notes ?? undefined,
  createdAt: r.created_at,
});

export function createSupabaseRepository(
  url: string,
  anonKey: string,
  bucket: string,
): RecipeRepository {
  const db: SupabaseClient = createClient(url, anonKey);

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  return {
    label: "Shared via Supabase",

    async list() {
      const { data, error } = await db
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as RecipeRow[]).map(fromRow);
    },

    async create(input: NewRecipe, imageFile?: File | null) {
      const imageUrl = imageFile ? await uploadImage(imageFile) : input.imageUrl;
      const { data, error } = await db
        .from("recipes")
        .insert({
          title: input.title,
          author: input.author,
          category: input.category,
          prep_time: input.prepTime,
          cook_time: input.cookTime,
          servings: input.servings,
          image_url: imageUrl ?? null,
          description: input.description ?? null,
          ingredients: input.ingredients,
          steps: input.steps,
          chefs_notes: input.chefsNotes ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return fromRow(data as RecipeRow);
    },
  };
}
