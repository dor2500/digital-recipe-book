"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import type { Recipe } from "@/lib/types";

interface Props {
  recipe: Recipe | null;
  onCancel: () => void;
  onConfirm: (recipe: Recipe) => Promise<void>;
}

/** "Are you sure?" before a recipe is torn out of the book for good. */
export function ConfirmDeleteDialog({ recipe, onCancel, onConfirm }: Props) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!recipe) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recipe, busy, onCancel]);

  const confirm = async () => {
    if (!recipe) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(recipe);
    } catch (e) {
      setError(e instanceof Error ? e.message : "המחיקה נכשלה.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {recipe && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="recipe-card w-full max-w-sm rounded-[6px] p-6 text-center shadow-card"
            initial={{ y: 30, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <p className="text-4xl" aria-hidden>
              🗑️
            </p>
            <h2 id={titleId} className="mt-2 font-serif text-2xl font-bold text-ink">
              למחוק את ״{recipe.title}״?
            </h2>
            <p className="mt-2 font-sans text-sm text-ink-soft">
              המתכון ייתלש מהספר לתמיד. אי אפשר לבטל את זה.
            </p>
            {error && (
              <p role="alert" className="mt-3 rounded bg-leather/10 px-3 py-2 font-sans text-sm text-leather">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="rounded-full px-4 py-2 font-sans text-sm text-ink-soft transition hover:text-ink"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                autoFocus
                className="btn-leather rounded-full px-6 py-2.5 font-sans text-sm font-bold"
              >
                {busy ? "מוחקים…" : "כן, למחוק"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
