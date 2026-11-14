import { mockRecipes } from "@/data/mockRecipes";
import type { NewRecipe, Recipe } from "@/lib/types";
import type { RecipeRepository } from "./types";

const KEY = "recipe-book:user-recipes:v1";

function readUserRecipes(): Recipe[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Recipe[]) : [];
  } catch {
    return [];
  }
}

/** Downscale an uploaded photo so it fits comfortably in localStorage. */
async function fileToCompressedDataUrl(file: File, maxSide = 1000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Zero-config backend: the bundled sample recipes plus anything the visitor
 * adds, kept in their own browser.
 */
export const localRepository: RecipeRepository = {
  label: "Saved in this browser",

  async list() {
    return [...mockRecipes, ...readUserRecipes()];
  },

  async create(input: NewRecipe, imageFile?: File | null) {
    const imageUrl = imageFile ? await fileToCompressedDataUrl(imageFile) : input.imageUrl;
    const recipe: Recipe = {
      ...input,
      imageUrl,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const next = [...readUserRecipes(), recipe];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        "Your browser's storage is full. Try a smaller photo, or paste an image URL instead.",
      );
    }
    return recipe;
  },
};
