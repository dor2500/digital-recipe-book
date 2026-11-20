import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NewRecipe, PhotoInput, Recipe } from "@/lib/types";
import { resolvePhotos, type RecipeRepository } from "./types";

/** Row shape of the `recipes` table (snake_case, see supabase/schema.sql). */
interface RecipeRow {
  id: string;
  title: string;
  author: string;
  category: Recipe["category"];
  prep_time: number;
  cook_time: number;
  servings: number;
  /** First photo, kept for older readers of the table. */
  image_url: string | null;
  /** All photos in order. Missing until supabase/add-images.sql has run. */
  images?: string[] | null;
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
  images: r.images?.length ? r.images : r.image_url ? [r.image_url] : [],
  description: r.description ?? undefined,
  ingredients: r.ingredients,
  steps: r.steps,
  chefsNotes: r.chefs_notes ?? undefined,
  ownerId: r.owner_id ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? undefined,
});

/** Turn database errors into something a cook can act on. */
function friendly(error: { code?: string; message: string }): Error {
  if (error.code === "23514" && /category/.test(error.message)) {
    return new Error(
      "הפרק הזה עוד לא מוגדר במסד הנתונים. מנהל האתר צריך להריץ את supabase/add-categories.sql.",
    );
  }
  return new Error(error.message);
}

/** PostgREST's answer when the `images` column has not been added yet. */
const missingImagesColumn = (error: { code?: string; message: string }) =>
  error.code === "PGRST204" && /images/.test(error.message);

const toRow = (r: NewRecipe, images: string[]) => ({
  title: r.title,
  author: r.author,
  category: r.category,
  prep_time: r.prepTime,
  cook_time: r.cookTime,
  servings: r.servings,
  image_url: images[0] ?? null,
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

  type Saved = { data: unknown; error: { code?: string; message: string } | null };

  /**
   * Writes a row with all its photos. A project set up before multi-photo
   * support has no `images` column yet: then a recipe with one photo is still
   * saved (in image_url), and more than one asks the owner to run the migration.
   */
  function saveRow(images: string[], write: (row: Record<string, unknown>) => PromiseLike<Saved>) {
    return async (row: Record<string, unknown>): Promise<Saved> => {
      const result = await write({ ...row, images });
      if (!result.error || !missingImagesColumn(result.error)) return result;
      if (images.length > 1) {
        throw new Error(
          "כדי לשמור כמה תמונות, מנהל האתר צריך להריץ את supabase/add-images.sql. בינתיים אפשר לשמור תמונה אחת.",
        );
      }
      return write(row);
    };
  }

  return {
    label: "המתכונים משותפים דרך Supabase",

    currentUserId: ensureUser,

    async list() {
      const { data, error } = await db
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw friendly(error);
      return (data as RecipeRow[]).map(fromRow);
    },

    async create(input: NewRecipe, photos: PhotoInput[]) {
      await ensureUser();
      const images = await resolvePhotos(photos, uploadImage);
      const { data, error } = await saveRow(images, (row) =>
        db.from("recipes").insert(row).select().single(),
      )(toRow(input, images));
      if (error) throw friendly(error);
      return fromRow(data as RecipeRow);
    },

    async update(id: string, input: NewRecipe, photos: PhotoInput[]) {
      await ensureUser();
      const images = await resolvePhotos(photos, uploadImage);
      const { data, error } = await saveRow(images, (row) =>
        db.from("recipes").update(row).eq("id", id).select().maybeSingle(),
      )({ ...toRow(input, images), updated_at: new Date().toISOString() });
      if (error) throw friendly(error);
      // Row-level security silently matches zero rows for someone else's recipe.
      if (!data) throw new Error("רק מי שהעלה את המתכון יכול לשנות אותו.");
      return fromRow(data as RecipeRow);
    },

    async remove(id) {
      await ensureUser();
      const { data, error } = await db.from("recipes").delete().eq("id", id).select("id");
      if (error) throw friendly(error);
      if (!data?.length) throw new Error("רק מי שהעלה את המתכון יכול למחוק אותו.");
    },
  };
}
