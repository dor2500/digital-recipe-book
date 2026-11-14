"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/types";

const TAB_COLOR: Record<Category, string> = {
  Breakfast: "bg-tab-breakfast",
  Mains: "bg-tab-mains",
  Sides: "bg-tab-sides",
  Breads: "bg-tab-breads",
  Baking: "bg-tab-baking",
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
  const navRef = useRef<HTMLElement>(null);

  // On phones the tab row scrolls sideways: keep the current section's tab in view.
  useEffect(() => {
    if (side || !active) return;
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active, side]);

  return (
    <nav
      ref={navRef}
      aria-label="פרקי הספר"
      className={
        side
          ? "absolute bottom-[5%] right-full top-[5%] z-0 flex flex-col gap-1.5"
          : // Seven tabs do not fit across a phone page: let the row scroll sideways.
          // pt-4 leaves room for the tabs' lift so the scroller does not clip it.
          "no-scrollbar absolute inset-x-[3%] bottom-full z-0 flex flex-row gap-1.5 overflow-x-auto pt-4"
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
                ? "bookmark-tab--side min-h-0 max-h-[124px] w-10 flex-1 pr-2 text-[clamp(10px,1.6vh,13px)] [writing-mode:vertical-rl]"
                : "bookmark-tab--top h-9 shrink-0 whitespace-nowrap px-3 pb-2.5 text-xs",
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
