import type { NewRecipe, Recipe } from "@/lib/types";

/**
 * The one seam between the UI and a backend.
 *
 * To add a backend (Firebase, Appwrite, your own API...), implement this
 * interface in a new file and return it from `getRecipeRepository()` in
 * ./index.ts. Nothing in the UI needs to change.
 */
export interface RecipeRepository {
  /** Human-readable name shown in the footer ("Saved in this browser", ...). */
  readonly label: string;
  list(): Promise<Recipe[]>;
  /**
   * Persist a new recipe. When `imageFile` is given, the backend uploads it
   * and stores the resulting URL in `imageUrl`.
   */
  create(recipe: NewRecipe, imageFile?: File | null): Promise<Recipe>;
}
