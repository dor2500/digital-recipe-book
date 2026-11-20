import { mockRecipes } from "@/data/mockRecipes";
import type { NewRecipe, PhotoInput, Recipe } from "@/lib/types";
import { resolvePhotos, type RecipeRepository } from "./types";

const RECIPES_KEY = "recipe-book:user-recipes:v1";
const OWNER_KEY = "recipe-book:owner-id";

function readUserRecipes(): Recipe[] {
  try {
    const raw = window.localStorage.getItem(RECIPES_KEY);
    const list = raw ? (JSON.parse(raw) as (Recipe & { imageUrl?: string })[]) : [];
    // Recipes saved before multi-photo support had a single `imageUrl`.
    return list.map(({ imageUrl, ...r }) => ({
      ...r,
      images: r.images ?? (imageUrl ? [imageUrl] : []),
    }));
  } catch {
    return [];
  }
}

function writeUserRecipes(list: Recipe[]) {
  try {
    window.localStorage.setItem(RECIPES_KEY, JSON.stringify(list));
  } catch {
    throw new Error("האחסון בדפדפן מלא. נסו פחות תמונות, או הדביקו קישורים לתמונות.");
  }
}

/** A random id that identifies this browser as the uploader. */
function ownerId(): string {
  try {
    let id = window.localStorage.getItem(OWNER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(OWNER_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

/** Downscale a photo from the gallery so it fits comfortably in localStorage. */
async function fileToCompressedDataUrl(file: File, maxSide = 1000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("לא הצלחנו לקרוא את התמונה. נסו קובץ JPG או PNG."));
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

function findOwned(id: string): { list: Recipe[]; index: number } {
  const list = readUserRecipes();
  const index = list.findIndex((r) => r.id === id);
  if (index === -1 || list[index].ownerId !== ownerId()) {
    throw new Error("רק מי שהעלה את המתכון יכול לשנות או למחוק אותו.");
  }
  return { list, index };
}

/**
 * Zero-config backend: the bundled sample recipes plus anything the visitor
 * adds, kept in their own browser.
 */
export const localRepository: RecipeRepository = {
  label: "המתכונים נשמרים בדפדפן הזה",

  async currentUserId() {
    return ownerId();
  },

  async list() {
    return [...mockRecipes, ...readUserRecipes()];
  },

  async create(input: NewRecipe, photos: PhotoInput[]) {
    const images = await resolvePhotos(photos, (f) => fileToCompressedDataUrl(f));
    const recipe: Recipe = {
      ...input,
      images,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ownerId: ownerId(),
    };
    writeUserRecipes([...readUserRecipes(), recipe]);
    return recipe;
  },

  async update(id: string, input: NewRecipe, photos: PhotoInput[]) {
    const { list, index } = findOwned(id);
    const images = await resolvePhotos(photos, (f) => fileToCompressedDataUrl(f));
    const updated: Recipe = {
      ...list[index],
      ...input,
      images,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    writeUserRecipes(list);
    return updated;
  },

  async remove(id: string) {
    const { list, index } = findOwned(id);
    list.splice(index, 1);
    writeUserRecipes(list);
  },
};
