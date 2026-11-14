"use client";

import { useCallback, useEffect, useState } from "react";
import { getRecipeRepository } from "@/lib/storage";
import type { NewRecipe, Recipe } from "@/lib/types";

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendLabel, setBackendLabel] = useState("");

  useEffect(() => {
    let alive = true;
    getRecipeRepository()
      .then(async (repo) => {
        setBackendLabel(repo.label);
        const list = await repo.list();
        if (alive) setRecipes(list);
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
    async (
      input: NewRecipe,
      imageFile?: File | null,
      beforeInsert?: (created: Recipe) => void,
    ) => {
      const repo = await getRecipeRepository();
      const created = await repo.create(input, imageFile);
      beforeInsert?.(created);
      setRecipes((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  return { recipes, loading, error, backendLabel, addRecipe };
}
