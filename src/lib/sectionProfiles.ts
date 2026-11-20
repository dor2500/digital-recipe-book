import type { Category } from "@/lib/types";

/** The three timed stages a recipe can have, all stored in minutes. */
export type TimeField = "prepTime" | "restTime" | "cookTime";
export type TimeUnit = "min" | "hour" | "day";

export const UNIT_MINUTES: Record<TimeUnit, number> = { min: 1, hour: 60, day: 1440 };
export const UNIT_LABEL: Record<TimeUnit, string> = { min: "דקות", hour: "שעות", day: "ימים" };

export interface TimeSpec {
  field: TimeField;
  /** What this stage is called in this section: "בישול", "אפייה", "התפחה"… */
  label: string;
  /** Unit the form offers first for a new recipe. */
  unit: TimeUnit;
  /** Starting value for a new recipe, in `unit`. */
  initial: number;
}

export interface SectionProfile {
  /** The timed stages this section has, in kitchen order. Others are hidden. */
  times: TimeSpec[];
  /** What the yield is counted in: "מנות", "יחידות", "פיצות"… */
  yieldLabel: string;
  yieldInitial: number;
  /** Examples shown as placeholders in the recipe card. */
  example: { title: string; ingredient: [string, string]; step: string };
}

const prep = (initial: number): TimeSpec => ({ field: "prepTime", label: "הכנה", unit: "min", initial });
const cook = (initial: number, label = "בישול"): TimeSpec => ({ field: "cookTime", label, unit: "min", initial });
const rest = (label: string, unit: TimeUnit, initial: number): TimeSpec => ({ field: "restTime", label, unit, initial });

/**
 * How each section of the book describes a recipe. A bread rises and bakes,
 * it is never "cooked"; a drink ferments; a dessert bakes and chills.
 */
export const SECTION_PROFILE: Record<Category, SectionProfile> = {
  Breakfast: {
    times: [prep(10), cook(15)],
    yieldLabel: "מנות",
    yieldInitial: 4,
    example: { title: "שקשוקה של שבת", ingredient: ["6", "ביצים"], step: "מחממים מחבת רחבה עם מעט שמן…" },
  },
  Starters: {
    times: [prep(20), cook(20, "צלייה / בישול")],
    yieldLabel: "מנות",
    yieldInitial: 6,
    example: { title: "ירקות קלויים בטאבון", ingredient: ["2", "חצילים"], step: "חוצים את הירקות ומברישים בשמן זית…" },
  },
  Soups: {
    times: [prep(15), cook(45)],
    yieldLabel: "מנות",
    yieldInitial: 6,
    example: { title: "מרק עדשים כתומות", ingredient: ["כוס", "עדשים כתומות"], step: "מטגנים בצל בסיר גדול עד שהוא שקוף…" },
  },
  Mains: {
    times: [prep(20), cook(45)],
    yieldLabel: "מנות",
    yieldInitial: 4,
    example: { title: "פלפלים ממולאים של סבתא", ingredient: ["6", "פלפלים"], step: "מחממים תנור ל-180 מעלות…" },
  },
  Pizza: {
    times: [prep(20), rest("התפחה", "hour", 24), cook(5, "אפייה")],
    yieldLabel: "פיצות",
    yieldInitial: 4,
    example: { title: "בצק פיצה נפוליטני 72 שעות", ingredient: ["1 ק״ג", "קמח 00"], step: "ממיסים את השמרים במים קרים…" },
  },
  Pasta: {
    times: [prep(40), rest("מנוחת בצק", "min", 30), cook(4)],
    yieldLabel: "מנות",
    yieldInitial: 4,
    example: { title: "פפרדלה בעבודת יד", ingredient: ["400 גרם", "קמח סמולינה"], step: "יוצרים הר קמח ושוברים את הביצים במרכז…" },
  },
  Sides: {
    times: [prep(10), cook(30)],
    yieldLabel: "מנות",
    yieldInitial: 4,
    example: { title: "תפוחי אדמה פריכים בתנור", ingredient: ["1 ק״ג", "תפוחי אדמה"], step: "מבשלים את תפוחי האדמה 8 דקות במים רותחים…" },
  },
  Sauces: {
    times: [prep(10), cook(30)],
    yieldLabel: "צנצנות",
    yieldInitial: 1,
    example: { title: "קונפי עגבניות צלוי", ingredient: ["500 גרם", "עגבניות שרי"], step: "מסדרים את העגבניות בתבנית ומכסים בשמן זית…" },
  },
  Breads: {
    times: [prep(20), rest("התפחה", "hour", 2), cook(30, "אפייה")],
    yieldLabel: "יחידות",
    yieldInitial: 8,
    example: { title: "פיתות מהטאבון", ingredient: ["500 גרם", "קמח לחם"], step: "לשים את הבצק 10 דקות עד שהוא חלק…" },
  },
  Baking: {
    times: [prep(30), rest("מנוחה / התפחה", "min", 30), cook(25, "אפייה")],
    yieldLabel: "יחידות",
    yieldInitial: 12,
    example: { title: "רוגלך שוקולד", ingredient: ["250 גרם", "חמאה קרה"], step: "מעבדים קמח וחמאה לפירורים…" },
  },
  Vegan: {
    times: [prep(15), cook(30)],
    yieldLabel: "מנות",
    yieldInitial: 4,
    example: { title: "קערת בודהה", ingredient: ["כוס", "קינואה"], step: "שוטפים את הקינואה ומבשלים 12 דקות…" },
  },
  Desserts: {
    times: [prep(30), cook(35, "אפייה"), rest("צינון", "hour", 2)],
    yieldLabel: "מנות",
    yieldInitial: 8,
    example: { title: "טארט שוקולד", ingredient: ["200 גרם", "שוקולד מריר"], step: "מחממים את השמנת עד סף רתיחה…" },
  },
  Drinks: {
    times: [prep(15), rest("תסיסה", "day", 14)],
    yieldLabel: "ליטרים",
    yieldInitial: 2,
    example: { title: "יין מנגו ירוק", ingredient: ["2 ק״ג", "מנגו ירוק"], step: "קולפים את המנגו וחותכים לקוביות…" },
  },
};

/** "45 דק׳", "שעתיים", "3 ימים", "שעה ו-20 דק׳". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} דק׳`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hours = h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שע׳`;
    return m ? `${hours} ו-${m} דק׳` : hours;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.round((minutes % 1440) / 60);
  const days = d === 1 ? "יום" : d === 2 ? "יומיים" : `${d} ימים`;
  return h ? `${days} ו-${h} שע׳` : days;
}

/** The unit an existing value reads best in when the card opens for editing. */
export function bestUnit(minutes: number, fallback: TimeUnit): TimeUnit {
  if (minutes <= 0) return fallback;
  if (minutes % 1440 === 0) return "day";
  if (minutes % 60 === 0) return "hour";
  return "min";
}
