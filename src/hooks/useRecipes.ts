"use client";

import { useCallback, useEffect, useState } from "react";
import { getRecipeRepository } from "@/lib/storage";
import type { NewRecipe, PhotoInput, Recipe } from "@/lib/types";

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendLabel, setBackendLabel] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getRecipeRepository()
      .then(async (repo) => {
        setBackendLabel(repo.label);
        const list = await repo.list();
        if (!alive) return;
        setRecipes(list);
        // Who is reading? Decides whether edit/delete buttons appear.
        repo.currentUserId().then(
          (id) => alive && setUserId(id),
          () => {},
        );
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Saves a recipe. `beforeInsert` runs after the backend accepted it but
   * before the book re-renders, so the caller can queue up a page turn.
   */
  const addRecipe = useCallback(
    async (input: NewRecipe, photos: PhotoInput[], beforeInsert?: (created: Recipe) => void) => {
      const repo = await getRecipeRepository();
      const created = await repo.create(input, photos);
      if (created.ownerId) setUserId(created.ownerId);
      beforeInsert?.(created);
      setRecipes((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const updateRecipe = useCallback(
    async (id: string, input: NewRecipe, photos: PhotoInput[]) => {
      const repo = await getRecipeRepository();
      const updated = await repo.update(id, input, photos);
      setRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    [],
  );

  const deleteRecipe = useCallback(async (id: string) => {
    const repo = await getRecipeRepository();
    await repo.remove(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recipes, loading, error, backendLabel, userId, addRecipe, updateRecipe, deleteRecipe };
}
