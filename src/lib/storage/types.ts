import type { NewRecipe, PhotoInput, Recipe } from "@/lib/types";

/**
 * The one seam between the UI and a backend.
 *
 * To add a backend (Firebase, Appwrite, your own API...), implement this
 * interface in a new file and return it from `getRecipeRepository()` in
 * ./index.ts. Nothing in the UI needs to change.
 */
export interface RecipeRepository {
  /** Shown in the footer ("נשמר בדפדפן הזה", ...). */
  readonly label: string;
  /** Id of the current visitor. A recipe is theirs when `ownerId` matches. */
  currentUserId(): Promise<string>;
  list(): Promise<Recipe[]>;
  /**
   * Persist a new recipe. `photos` are in display order: files are uploaded
   * and become URLs in `images`; URLs are kept as they are.
   */
  create(recipe: NewRecipe, photos: PhotoInput[]): Promise<Recipe>;
  /** Replace a recipe's content and photos. Only its owner may do this. */
  update(id: string, recipe: NewRecipe, photos: PhotoInput[]): Promise<Recipe>;
  /** Delete a recipe. Only its owner may do this. */
  remove(id: string): Promise<void>;
}

/** Turn the form's photos into URLs, uploading new files in parallel but keeping their order. */
export function resolvePhotos(
  photos: PhotoInput[],
  upload: (file: File) => Promise<string>,
): Promise<string[]> {
  return Promise.all(photos.map((p) => ("file" in p ? upload(p.file) : Promise.resolve(p.url))));
}
