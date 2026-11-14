"use client";

import { motion } from "framer-motion";
import { CATEGORIES, type Category } from "@/lib/types";

const TAB_COLOR: Record<Category, string> = {
  Breakfast: "bg-tab-breakfast",
  Mains: "bg-tab-mains",
  Vegan: "bg-tab-vegan",
  Desserts: "bg-tab-desserts",
};

interface Props {
  /** category → first page of its section; categories without recipes are disabled */
  categoryPage: Partial<Record<Category, number>>;
  active: Category | null;
  orientation: "side" | "top";
  onSelect: (page: number) => void;
}

/**
 * Cloth index tabs glued to the fore-edge of the pages. On desktop they stick
 * out of the right-hand edge; in single-page (mobile) mode they sit on top.
 */
export function BookmarkTabs({ categoryPage, active, orientation, onSelect }: Props) {
  const side = orientation === "side";
  return (
    <nav
      aria-label="Recipe sections"
      className={
        side
          ? "absolute bottom-[8%] left-full top-[8%] z-0 flex flex-col gap-2"
          : "absolute inset-x-[5%] bottom-full z-0 flex flex-row gap-1.5"
      }
    >
      {CATEGORIES.map((category) => {
        const page = categoryPage[category];
        const isActive = active === category;
        const disabled = page === undefined;
        const rest = side ? { x: isActive ? 6 : -10 } : { y: isActive ? -13 : -9 };
        const hover = side ? { x: 10 } : { y: -15 };
        return (
          <motion.button
            key={category}
            type="button"
            disabled={disabled}
            onClick={() => page !== undefined && onSelect(page)}
            initial={false}
            animate={rest}
            whileHover={disabled ? undefined : hover}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            aria-current={isActive ? "true" : undefined}
            title={disabled ? `No ${category.toLowerCase()} recipes yet` : `Jump to ${category}`}
            className={[
              "bookmark-tab font-sans font-semibold uppercase text-white/95",
              TAB_COLOR[category],
              side
                ? "bookmark-tab--side min-h-0 max-h-[124px] w-9 flex-1 pl-2.5 text-[10.5px] tracking-[.16em] [writing-mode:vertical-rl]"
                : "bookmark-tab--top h-9 min-w-0 max-w-[8rem] flex-1 truncate px-1.5 pb-2.5 text-[clamp(8px,2.4vw,10px)] tracking-[.12em]",
              disabled ? "cursor-not-allowed opacity-40 saturate-50" : "cursor-pointer",
            ].join(" ")}
          >
            {category}
          </motion.button>
        );
      })}
    </nav>
  );
}
