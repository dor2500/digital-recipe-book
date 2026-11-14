import { CATEGORIES, type Category, type Recipe } from "@/lib/types";

/**
 * Turns a flat list of recipes into the ordered pages of the book.
 * Pure and framework-free so it is easy to unit test.
 *
 *   0            front cover (hard, shown alone)
 *   1 … T        table of contents (T is always even)
 *   T+1, T+2     recipe #1  (left page, right page)
 *   …
 *   last         back cover (hard, shown alone)
 *
 * With `showCover`, the flip engine shows page 0 alone and then pairs pages
 * (1,2), (3,4)…, so every odd index is a left-hand page. Keeping T even
 * guarantees each recipe opens as a proper two-page spread.
 */

export type TocLine =
  | { type: "category"; category: Category }
  | { type: "recipe"; recipe: Recipe; page: number };

export type PageSpec =
  | { kind: "cover" }
  | { kind: "toc"; lines: TocLine[]; sheet: number; sheets: number }
  | { kind: "endpaper" }
  | { kind: "recipe-left"; recipe: Recipe }
  | { kind: "recipe-right"; recipe: Recipe }
  | { kind: "back-cover" };

export interface BookLayout {
  pages: PageSpec[];
  /** Recipes in the order they appear in the book. */
  recipes: Recipe[];
  /** recipe id → index of its left page */
  recipePage: Record<string, number>;
  /** category → index of the first left page in that section (absent if empty) */
  categoryPage: Partial<Record<Category, number>>;
  /** index of the first ToC page */
  tocPage: number;
}

/** Lines that fit on one ToC page at the book's aspect ratio. */
export const TOC_LINES_PER_PAGE = 13;

export function sortRecipes(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort(
    (a, b) =>
      CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

function paginateToc(lines: TocLine[], perPage: number): TocLine[][] {
  const pages: TocLine[][] = [[]];
  for (const line of lines) {
    let page = pages[pages.length - 1];
    // Don't leave a category heading orphaned at the bottom of a page.
    const needed = line.type === "category" ? 2 : 1;
    if (page.length + needed > perPage && page.length > 0) {
      page = [];
      pages.push(page);
    }
    page.push(line);
  }
  return pages;
}

export function buildBookLayout(
  input: Recipe[],
  linesPerPage = TOC_LINES_PER_PAGE,
): BookLayout {
  const recipes = sortRecipes(input);

  // Build ToC lines first with placeholder page numbers, so we know how many
  // ToC pages there are; then fill in the real numbers.
  const draft: TocLine[] = [];
  for (const category of CATEGORIES) {
    const inCategory = recipes.filter((r) => r.category === category);
    if (!inCategory.length) continue;
    draft.push({ type: "category", category });
    for (const recipe of inCategory) draft.push({ type: "recipe", recipe, page: -1 });
  }

  const tocSheets = paginateToc(draft, linesPerPage);
  // Pad to an even page count so recipes start on a left-hand page.
  const tocPageCount = tocSheets.length + (tocSheets.length % 2);
  const firstRecipePage = 1 + tocPageCount;

  const recipePage: Record<string, number> = {};
  const categoryPage: BookLayout["categoryPage"] = {};
  recipes.forEach((recipe, i) => {
    const page = firstRecipePage + i * 2;
    recipePage[recipe.id] = page;
    categoryPage[recipe.category] ??= page;
  });

  for (const line of draft) {
    if (line.type === "recipe") line.page = recipePage[line.recipe.id];
  }

  const pages: PageSpec[] = [{ kind: "cover" }];
  tocSheets.forEach((lines, sheet) =>
    pages.push({ kind: "toc", lines, sheet, sheets: tocSheets.length }),
  );
  if (tocSheets.length % 2) pages.push({ kind: "endpaper" });
  for (const recipe of recipes) {
    pages.push({ kind: "recipe-left", recipe }, { kind: "recipe-right", recipe });
  }
  pages.push({ kind: "back-cover" });

  return { pages, recipes, recipePage, categoryPage, tocPage: 1 };
}

/** Which category's section a page belongs to (for highlighting the active tab). */
export function categoryAtPage(layout: BookLayout, page: number): Category | null {
  const spec = layout.pages[page];
  if (spec && (spec.kind === "recipe-left" || spec.kind === "recipe-right")) {
    return spec.recipe.category;
  }
  return null;
}
