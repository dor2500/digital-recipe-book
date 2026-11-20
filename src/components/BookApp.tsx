"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookmarkTabs } from "@/components/book/BookmarkTabs";
import type { BookHandle } from "@/components/book/Book";
import type { PageActions } from "@/components/book/PageContents";
import { PhotoViewer, type PhotoViewerState } from "@/components/PhotoViewer";
import { ConfirmDeleteDialog } from "@/components/form/ConfirmDeleteDialog";
import { RecipeFormModal } from "@/components/form/RecipeFormModal";
import { useElementSize } from "@/hooks/useElementSize";
import { useRecipes } from "@/hooks/useRecipes";
import { buildBookLayout, categoryAtPage } from "@/lib/bookLayout";
import type { NewRecipe, PhotoInput, Recipe } from "@/lib/types";

// page-flip touches `window` at import time, so it is client-only.
const Book = dynamic(() => import("@/components/book/Book").then((m) => m.Book), {
  ssr: false,
});

const PAGE_RATIO = 0.75; // keep in sync with Book.PAGE_RATIO
const MAX_PAGE_WIDTH = 560;
const LANDSCAPE_MIN_STAGE = 760;

type ThemeId = "wood" | "marble" | "night" | "sage";

const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: "wood", label: "עץ קלאסי", swatch: "#5a3721" },
  { id: "marble", label: "שיש בהיר", swatch: "#e5dfd4" },
  { id: "night", label: "מטבח לילי", swatch: "#182233" },
  { id: "sage", label: "כפרי זית", swatch: "#3d4937" },
];
const THEME_STORAGE_KEY = "torfim_theme";

export default function BookApp() {
  const { recipes, loading, error, backendLabel, userId, addRecipe, updateRecipe, deleteRecipe } =
    useRecipes();
  const layout = useMemo(() => buildBookLayout(recipes), [recipes]);

  const [stageRef, stage] = useElementSize<HTMLDivElement>();
  const bookRef = useRef<BookHandle>(null);
  /** Current page, in reading order (first page of the visible spread). */
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [deleting, setDeleting] = useState<Recipe | null>(null);
  const [viewer, setViewer] = useState<PhotoViewerState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** Bumped on edits so the book re-reads page contents. */
  const [contentVersion, setContentVersion] = useState(0);
  const [theme, setTheme] = useState<ThemeId>("wood");
  const pendingFlip = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // --- Fit the book to the free space ---------------------------------
  const portrait = stage.width > 0 && stage.width < LANDSCAPE_MIN_STAGE;
  const pageWidth = Math.floor(
    portrait
      ? Math.min(stage.width - 24, (stage.height - 56) * PAGE_RATIO, MAX_PAGE_WIDTH)
      : Math.min((stage.width - 48) / 2, (stage.height - 64) * PAGE_RATIO, MAX_PAGE_WIDTH),
  );
  const ready = !loading && stage.width > 0 && pageWidth > 120;
  const lastPage = layout.pages.length - 1;

  // page-flip reads its config once; remount when any of these change.
  const bookKey = `${portrait ? "p" : "l"}-${pageWidth}-${layout.pages.length}-${contentVersion}-${userId ?? ""}`;

  // After a recipe is added the book remounts with more pages; once the new
  // flip engine is ready, turn to the new recipe.
  const handleReady = useCallback(() => {
    const target = pendingFlip.current;
    if (target === null) return;
    pendingFlip.current = null;
    setTimeout(() => bookRef.current?.flipTo(target), 300);
  }, []);

  const modalOpen = formOpen || !!deleting || !!viewer;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen || (e.target as HTMLElement).closest("input, textarea, select")) return;
      // Hebrew book: the next page is to the left.
      if (e.key === "ArrowLeft") bookRef.current?.next();
      if (e.key === "ArrowRight") bookRef.current?.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  const goTo = useCallback((p: number) => bookRef.current?.flipTo(p), []);

  const ownerActions = useMemo<PageActions>(
    () => ({
      onEdit: (recipe) => {
        setEditing(recipe);
        setFormOpen(true);
      },
      onDelete: (recipe) => setDeleting(recipe),
      onViewPhotos: (images, index, title) => setViewer({ images, index, title }),
    }),
    [],
  );

  const openNewRecipe = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const closeForm = useCallback(() => setFormOpen(false), []);
  const cancelDelete = useCallback(() => setDeleting(null), []);
  const closeViewer = useCallback(() => setViewer(null), []);

  const handleSubmit = async (input: NewRecipe, photos: PhotoInput[]) => {
    if (editing) {
      const updated = await updateRecipe(editing.id, input, photos);
      // The category may have moved the recipe to another section.
      pendingFlip.current = buildBookLayout(recipes.map((r) => (r.id === updated.id ? updated : r)))
        .recipePage[updated.id];
      setContentVersion((v) => v + 1);
      setFormOpen(false);
      setToast(`״${updated.title}״ עודכן ✔`);
      return;
    }
    let target = 0;
    const created = await addRecipe(input, photos, (recipe) => {
      target = buildBookLayout([...recipes, recipe]).recipePage[recipe.id];
      pendingFlip.current = target;
    });
    setFormOpen(false);
    setToast(`״${created.title}״ נוסף לספר בעמוד ${target} 🔥`);
  };

  const handleDelete = async (recipe: Recipe) => {
    await deleteRecipe(recipe.id);
    setPage(layout.tocPage); // reopen at the contents
    setDeleting(null);
    setToast(`״${recipe.title}״ נמחק מהספר`);
  };

  // --- Base under the pages: the open cover board + page-block edges ---
  // Right-to-left: the closed front cover lies on the left half, the back on the right.
  const baseShape = portrait ? "full" : page === 0 ? "left" : page >= lastPage ? "right" : "full";
  const spreadWidth = portrait ? pageWidth : pageWidth * 2;
  const pageHeight = Math.round(pageWidth / PAGE_RATIO);

  const folio = portrait
    ? page === 0
      ? "כריכה"
      : page >= lastPage
        ? "כריכה אחורית"
        : `עמוד ${page} מתוך ${lastPage - 1}`
    : page === 0
      ? "כריכה"
      : page >= lastPage
        ? "כריכה אחורית"
        : `עמודים ${page}–${page + 1} מתוך ${lastPage - 1}`;

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden">
      <div aria-hidden className="theme-blur-backdrop" />

      <header className="relative z-20 flex items-center justify-between gap-3 px-4 pt-3 sm:px-8 sm:pt-5">
        <button type="button" onClick={() => goTo(layout.tocPage)} className="group flex items-baseline gap-2 text-start">
          <span
            className="font-serif text-xl font-bold drop-shadow sm:text-2xl"
            style={{ color: "var(--ui-ink)" }}
          >
            טורפים את המטבח <span aria-hidden>🌶️🔥</span>
          </span>
          <span
            className="hidden font-sans text-sm opacity-65 transition group-hover:opacity-100 sm:inline"
            style={{ color: "var(--ui-ink)" }}
          >
            תוכן העניינים
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="theme-glass flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 shadow-sm"
            role="group"
            aria-label="ערכת נושא"
            title="בחר ערכת נושא"
          >
            <span className="hidden text-xs font-medium opacity-80 md:inline">ערכת נושא</span>
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={active}
                  className={`h-4 w-4 rounded-full border transition-transform ${
                    active ? "scale-125 ring-2 ring-gilt border-white" : "border-white/40 opacity-80 hover:scale-110 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: t.swatch }}
                />
              );
            })}
          </div>

          <motion.button
            type="button"
            onClick={openNewRecipe}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="btn-leather flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-sans text-sm font-bold backdrop-blur-md"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span>הוספת מתכון</span>
          </motion.button>
        </div>
      </header>

      <div ref={stageRef} className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
        {error && (
          <p className="max-w-md rounded bg-black/40 px-4 py-3 text-center font-sans text-sm text-paper">
            לא הצלחנו לטעון את המתכונים: {error}
          </p>
        )}

        {ready && !error && (
          <motion.div
            key={portrait ? "portrait" : "landscape"}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative"
            // The flip engine lays pages out left-to-right; keep its box LTR.
            dir="ltr"
            style={{ width: spreadWidth, height: pageHeight, marginTop: 36 }}
          >
            <div dir="rtl">
              <BookmarkTabs
                categoryPage={layout.categoryPage}
                active={categoryAtPage(layout, page)}
                onSelect={goTo}
              />
            </div>

            <motion.div
              aria-hidden
              className="book-base"
              initial={false}
              animate={{
                left: baseShape === "right" ? "50%" : "0%",
                right: baseShape === "left" ? "50%" : "0%",
              }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />

            <div className="relative z-10" dir="rtl">
              <Book
                key={bookKey}
                controlRef={bookRef}
                layout={layout}
                pageWidth={pageWidth}
                portrait={portrait}
                startPage={Math.min(page, lastPage)}
                onPageChange={setPage}
                onReady={handleReady}
                viewerId={userId}
                ownerActions={ownerActions}
              />
            </div>
          </motion.div>
        )}

        {loading && (
          <p className="font-serif text-lg opacity-80" style={{ color: "var(--ui-ink)" }}>
            מנגבים את האבק מהספר…
          </p>
        )}
      </div>

      <footer className="relative z-20 flex items-center justify-center gap-4 px-4 pb-3 pt-2 font-sans sm:pb-5">
        <div className="theme-glass flex items-center gap-3 rounded-full border px-3 py-1.5 shadow-md">
          <NavButton label="לעמוד הקודם" onClick={() => bookRef.current?.prev()} disabled={page === 0}>
            <path d="M9 5l7 7-7 7" />
          </NavButton>
          <span className="min-w-[9rem] text-center text-sm tabular-nums">{folio}</span>
          <NavButton label="לעמוד הבא" onClick={() => bookRef.current?.next()} disabled={page >= lastPage}>
            <path d="M15 5l-7 7 7 7" />
          </NavButton>
        </div>
        {backendLabel && (
          <span
            className="absolute left-6 hidden text-xs opacity-60 lg:block"
            style={{ color: "var(--ui-ink)" }}
          >
            {backendLabel}
          </span>
        )}
      </footer>

      <RecipeFormModal open={formOpen} recipe={editing} onClose={closeForm} onSubmit={handleSubmit} />
      <ConfirmDeleteDialog recipe={deleting} onCancel={cancelDelete} onConfirm={handleDelete} />
      <PhotoViewer state={viewer} onClose={closeViewer} />

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="theme-glass fixed bottom-16 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border px-5 py-2.5 font-sans text-sm shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-current/25 p-1.5 opacity-85 transition hover:border-current/60 hover:bg-white/10 hover:opacity-100 disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
