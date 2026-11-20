/**
 * Core data model. Every storage backend (local, Supabase, Firebase, ...)
 * reads and writes exactly these shapes.
 */

/**
 * Internal section keys (stable, also stored in the database).
 * Book order: sections appear in this order, each with its own tab.
 */
export const CATEGORIES = [
  "Breakfast",
  "Starters",
  "Soups",
  "Mains",
  "Pizza",
  "Pasta",
  "Sides",
  "Sauces",
  "Breads",
  "Baking",
  "Vegan",
  "Desserts",
  "Drinks",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Full section name: contents page, recipe pages, the form. */
export const CATEGORY_LABEL: Record<Category, string> = {
  Breakfast: "ארוחות בוקר",
  Starters: "ראשונות ומתאבנים",
  Soups: "מרקים",
  Mains: "עיקריות",
  Pizza: "פיצות וטאבון",
  Pasta: "פסטה בעבודת יד",
  Sides: "תוספות",
  Sauces: "ממרחים ורטבים",
  Breads: "לחמים",
  Baking: "מאפים",
  Vegan: "טבעוני",
  Desserts: "קינוחים",
  Drinks: "משקאות ואלכוהול",
};

/** Short name that fits on a bookmark tab. */
export const CATEGORY_TAB: Record<Category, string> = {
  Breakfast: "בוקר",
  Starters: "ראשונות",
  Soups: "מרקים",
  Mains: "עיקריות",
  Pizza: "פיצות",
  Pasta: "פסטה",
  Sides: "תוספות",
  Sauces: "רטבים",
  Breads: "לחמים",
  Baking: "מאפים",
  Vegan: "טבעוני",
  Desserts: "קינוחים",
  Drinks: "משקאות",
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
  /** Minutes. Cooking or baking, depending on the section. */
  cookTime: number;
  /**
   * Minutes of waiting: rising, resting, chilling or fermenting, depending on
   * the section (see SECTION_PROFILE). 0 or missing when there is none.
   */
  restTime?: number;
  servings: number;
  /**
   * Photos of the dish, in order; the first one is the cover shown on the page.
   * Remote URLs, or data: URLs for photos stored in the browser. May be empty.
   */
  images: string[];
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

/** Most photos one recipe can have. */
export const MAX_PHOTOS = 10;

/** What the recipe form submits. Photos travel separately (see PhotoInput). */
export type NewRecipe = Omit<Recipe, "id" | "createdAt" | "updatedAt" | "ownerId" | "images">;

/**
 * One photo as the form hands it to a backend, in display order: either a
 * photo that already has a URL (kept from before, or a pasted link) or a new
 * file from the gallery or camera that the backend must upload.
 */
export type PhotoInput = { url: string } | { file: File };
