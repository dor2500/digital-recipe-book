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
  owner_id: string | null;
  created_at: string;
  updated_at: string | null;
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
  ownerId: r.owner_id ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? undefined,
});

const toRow = (r: NewRecipe, imageUrl: string | undefined) => ({
  title: r.title,
  author: r.author,
  category: r.category,
  prep_time: r.prepTime,
  cook_time: r.cookTime,
  servings: r.servings,
  image_url: imageUrl ?? null,
  description: r.description ?? null,
  ingredients: r.ingredients,
  steps: r.steps,
  chefs_notes: r.chefsNotes ?? null,
});

/**
 * Supabase backend. Each visitor is signed in anonymously, so every recipe
 * row carries the uploader's user id and row-level security lets only that
 * user update or delete it. Enable "Anonymous sign-ins" in the dashboard.
 */
export function createSupabaseRepository(
  url: string,
  anonKey: string,
  bucket: string,
): RecipeRepository {
  const db: SupabaseClient = createClient(url, anonKey);

  let userId: Promise<string> | null = null;
  function ensureUser(): Promise<string> {
    userId ??= (async () => {
      const { data } = await db.auth.getSession();
      if (data.session) return data.session.user.id;
      const { data: signed, error } = await db.auth.signInAnonymously();
      if (error || !signed.user) {
        userId = null;
        throw new Error(`ההתחברות ל-Supabase נכשלה: ${error?.message ?? "שגיאה לא ידועה"}`);
      }
      return signed.user.id;
    })();
    return userId;
  }

  async function uploadImage(file: File): Promise<string> {
    const owner = await ensureUser();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${owner}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from(bucket).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw new Error(`העלאת התמונה נכשלה: ${error.message}`);
    return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  return {
    label: "המתכונים משותפים דרך Supabase",

    currentUserId: ensureUser,

    async list() {
      const { data, error } = await db
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as RecipeRow[]).map(fromRow);
    },

    async create(input, imageFile) {
      await ensureUser();
      const imageUrl = imageFile ? await uploadImage(imageFile) : input.imageUrl;
      const { data, error } = await db
        .from("recipes")
        .insert(toRow(input, imageUrl))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return fromRow(data as RecipeRow);
    },

    async update(id, input, imageFile) {
      await ensureUser();
      const imageUrl = imageFile ? await uploadImage(imageFile) : input.imageUrl;
      const { data, error } = await db
        .from("recipes")
        .update({ ...toRow(input, imageUrl), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      // Row-level security silently matches zero rows for someone else's recipe.
      if (!data) throw new Error("רק מי שהעלה את המתכון יכול לשנות אותו.");
      return fromRow(data as RecipeRow);
    },

    async remove(id) {
      await ensureUser();
      const { data, error } = await db.from("recipes").delete().eq("id", id).select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("רק מי שהעלה את המתכון יכול למחוק אותו.");
    },
  };
}
