"use client";

import { motion } from "framer-motion";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/types";

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
 * out of the left edge (the unread side of a Hebrew book); in single-page
 * (mobile) mode they sit on top.
 */
export function BookmarkTabs({ categoryPage, active, orientation, onSelect }: Props) {
  const side = orientation === "side";
  return (
    <nav
      aria-label="פרקי הספר"
      className={
        side
          ? "absolute bottom-[8%] right-full top-[8%] z-0 flex flex-col gap-2"
          : "absolute inset-x-[5%] bottom-full z-0 flex flex-row gap-1.5"
      }
    >
      {CATEGORIES.map((category) => {
        const page = categoryPage[category];
        const isActive = active === category;
        const disabled = page === undefined;
        const label = CATEGORY_LABEL[category];
        const rest = side ? { x: isActive ? -8 : 6 } : { y: isActive ? -13 : -9 };
        const hover = side ? { x: -10 } : { y: -15 };
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
            title={disabled ? `אין עדיין מתכונים ב${label}` : `מעבר ל${label}`}
            className={[
              "bookmark-tab font-sans font-bold text-white/95",
              TAB_COLOR[category],
              side
                ? "bookmark-tab--side min-h-0 max-h-[124px] w-10 flex-1 pr-2 text-[13px] [writing-mode:vertical-rl]"
                : "bookmark-tab--top h-9 min-w-0 max-w-[8rem] flex-1 truncate px-1.5 pb-2.5 text-[clamp(10px,3vw,12px)]",
              disabled ? "cursor-not-allowed opacity-40 saturate-50" : "cursor-pointer",
            ].join(" ")}
          >
            {label}
          </motion.button>
        );
      })}
    </nav>
  );
}
