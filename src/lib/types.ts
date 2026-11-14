/**
 * Core data model. Every storage backend (local, Supabase, Firebase, ...)
 * reads and writes exactly these shapes.
 */

/** Internal category keys (stable, also stored in the database). */
/** Book order: sections appear in this order, each with its own tab. */
export const CATEGORIES = [
  "Breakfast",
  "Mains",
  "Sides",
  "Breads",
  "Baking",
  "Vegan",
  "Desserts",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** What readers see. */
export const CATEGORY_LABEL: Record<Category, string> = {
  Breakfast: "ארוחות בוקר",
  Mains: "עיקריות",
  Sides: "תוספות",
  Breads: "לחמים",
  Baking: "מאפים",
  Vegan: "טבעוני",
  Desserts: "קינוחים",
};

export interface Ingredient {
  /** "2 כוסות", "כף", "קורט" — free text so cooks can write naturally. */
  quantity: string;
  /** "קמח לבן" */
  name: string;
}

export interface Recipe {
  id: string;
  title: string;
  /** The name of whoever uploaded the recipe, shown as "הועלה על ידי". */
  author: string;
  category: Category;
  /** Minutes. */
  prepTime: number;
  /** Minutes. */
  cookTime: number;
  servings: number;
  /** Remote URL or a data: URL for locally stored uploads. Optional. */
  imageUrl?: string;
  /** One-line teaser shown on the method page. */
  description?: string;
  ingredients: Ingredient[];
  /** Ordered cooking steps. */
  steps: string[];
  chefsNotes?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp of the last edit, if any. */
  updatedAt?: string;
  /**
   * Opaque id of the uploader (a per-browser id locally, the Supabase user id
   * remotely). Only the uploader may edit or delete. Sample recipes have none.
   */
  ownerId?: string;
}

/** What the recipe form submits. The backend assigns the rest. */
export type NewRecipe = Omit<Recipe, "id" | "createdAt" | "updatedAt" | "ownerId">;
