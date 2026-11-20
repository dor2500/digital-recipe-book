"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export interface PhotoViewerState {
  images: string[];
  index: number;
  title: string;
}

interface Props {
  state: PhotoViewerState | null;
  onClose: () => void;
}

/** Full-screen photo viewer for a recipe's photos: arrows, swipe, keyboard, thumbnails. */
export function PhotoViewer({ state, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const count = state?.images.length ?? 0;

  useEffect(() => {
    if (state) setIndex(state.index);
  }, [state]);

  const go = (by: number) => count && setIndex((i) => (i + by + count) % count);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Right-to-left: the next photo is to the left.
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, count, onClose]);

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`תמונות: ${state.title}`}
          className="fixed inset-0 z-[60] flex flex-col bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            // Swipe right brings the next photo (it comes in from the left).
            if (Math.abs(dx) > 40) go(dx > 0 ? 1 : -1);
            setTouchX(null);
          }}
        >
          <header className="flex items-center justify-between gap-3 px-4 py-3 text-paper">
            <p className="truncate font-serif text-lg font-bold">{state.title}</p>
            <div className="flex shrink-0 items-center gap-3">
              {count > 1 && (
                <span className="font-sans text-sm tabular-nums text-paper/70">
                  {index + 1} מתוך {count}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="סגירה"
                className="rounded-full p-2 text-paper/80 transition hover:bg-white/10 hover:text-paper"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </header>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={state.images[index]}
                src={state.images[index]}
                alt={`${state.title}, תמונה ${index + 1}`}
                draggable={false}
                className="max-h-full max-w-full rounded object-contain shadow-2xl"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
              />
            </AnimatePresence>
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="התמונה הקודמת"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-paper transition hover:bg-white/30"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="התמונה הבאה"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-paper transition hover:bg-white/30"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {count > 1 && (
            <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto px-4 py-3">
              {state.images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`תמונה ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded transition ${
                    i === index ? "ring-2 ring-paper" : "opacity-50 hover:opacity-90"
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
