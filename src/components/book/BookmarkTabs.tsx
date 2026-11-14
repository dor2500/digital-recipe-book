"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_TAB, type Category } from "@/lib/types";

const TAB_COLOR: Record<Category, string> = {
  Breakfast: "bg-tab-breakfast",
  Starters: "bg-tab-starters",
  Soups: "bg-tab-soups",
  Mains: "bg-tab-mains",
  Pizza: "bg-tab-pizza",
  Pasta: "bg-tab-pasta",
  Sides: "bg-tab-sides",
  Sauces: "bg-tab-sauces",
  Breads: "bg-tab-breads",
  Baking: "bg-tab-baking",
  Vegan: "bg-tab-vegan",
  Desserts: "bg-tab-desserts",
  Drinks: "bg-tab-drinks",
};

interface Props {
  /** category → first page of its section; categories without recipes are disabled */
  categoryPage: Partial<Record<Category, number>>;
  active: Category | null;
  onSelect: (page: number) => void;
}

/**
 * Cloth index tabs glued along the top edge of the pages, one per section.
 * There are more tabs than fit on a narrow screen, so the row scrolls
 * sideways and keeps the current section's tab in view.
 */
export function BookmarkTabs({ categoryPage, active, onSelect }: Props) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active) return;
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <nav
      ref={navRef}
      aria-label="פרקי הספר"
      // pt-4 leaves room for the tabs' lift so the scroller does not clip it.
      className="no-scrollbar absolute inset-x-[2%] bottom-full z-0 flex flex-row gap-1 overflow-x-auto pt-4"
    >
      {CATEGORIES.map((category) => {
        const page = categoryPage[category];
        const isActive = active === category;
        const disabled = page === undefined;
        const label = CATEGORY_LABEL[category];
        return (
          <motion.button
            key={category}
            type="button"
            disabled={disabled}
            onClick={() => page !== undefined && onSelect(page)}
            initial={false}
            animate={{ y: isActive ? -13 : -9 }}
            whileHover={disabled ? undefined : { y: -15 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            aria-current={isActive ? "true" : undefined}
            aria-label={label}
            title={disabled ? `אין עדיין מתכונים ב${label}` : `מעבר ל${label}`}
            className={[
              "bookmark-tab bookmark-tab--top h-9 shrink-0 whitespace-nowrap px-2.5 pb-2.5 font-sans text-xs font-bold text-white/95",
              TAB_COLOR[category],
              disabled ? "cursor-not-allowed opacity-40 saturate-50" : "cursor-pointer",
            ].join(" ")}
          >
            {CATEGORY_TAB[category]}
          </motion.button>
        );
      })}
    </nav>
  );
}
