/**
 * Core data model. Every storage backend (local, Supabase, Firebase, ...)
 * reads and writes exactly these shapes.
 */

export const CATEGORIES = ["Breakfast", "Mains", "Vegan", "Desserts"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Ingredient {
  /** "2 cups", "1 tbsp", "a pinch" — free text so cooks can write naturally. */
  quantity: string;
  /** "all-purpose flour" */
  name: string;
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  category: Category;
  /** Minutes. */
  prepTime: number;
  /** Minutes. */
  cookTime: number;
  servings: number;
  /** Remote URL or a data: URL for locally stored uploads. Optional. */
  imageUrl?: string;
  /** One-line teaser shown under the title. */
  description?: string;
  ingredients: Ingredient[];
  /** Ordered cooking steps. */
  steps: string[];
  chefsNotes?: string;
  /** ISO timestamp. */
  createdAt: string;
}

/** What the "Add Recipe" form submits. The backend assigns id/createdAt. */
export type NewRecipe = Omit<Recipe, "id" | "createdAt">;
