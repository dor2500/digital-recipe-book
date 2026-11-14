# Kitchen Stories: a digital recipe book

An open-source cookbook that looks and turns like a real one. Browse recipes in
a leather-bound book with realistic page curls, jump around with cloth index
tabs, and add your own recipes on a lined recipe card.

- **Two-page spread** on desktop, **single page** on phones, with the flip animation in both
- **Dynamic table of contents** that rebuilds itself and turns to a recipe when you click it
- **Bookmark tabs** (Breakfast, Mains, Vegan, Desserts) that jump to each section
- **Add Recipe card** with dynamic ingredient and step lists, plus photo by URL or upload
- **Pluggable storage**: works offline out of the box (browser storage), or point it at Supabase

Built with Next.js (App Router), Tailwind CSS, Framer Motion and
[`react-pageflip`](https://github.com/Nodlik/react-pageflip).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no configuration, the book shows the bundled
sample recipes, and anything you add is saved in your browser.

## Project structure

```
src/
├─ app/
│  ├─ layout.tsx          fonts (Playfair Display, Source Sans 3, Caveat) + wooden table
│  ├─ page.tsx
│  ├─ globals.css         paper, leather, wood, tabs and recipe-card styling
│  └─ icon.svg
├─ components/
│  ├─ BookApp.tsx         sizing, page state, controls, wiring
│  ├─ book/
│  │  ├─ Book.tsx         the flipbook: page-flip config + page rendering
│  │  ├─ Paper.tsx        one physical page (soft paper or hard cover)
│  │  ├─ PageContents.tsx cover, contents, recipe left/right pages
│  │  └─ BookmarkTabs.tsx category tabs (side on desktop, top on mobile)
│  └─ form/
│     └─ AddRecipeModal.tsx  the "recipe card" form
├─ data/mockRecipes.ts    sample recipes (also a data-shape reference)
├─ hooks/                 useRecipes, useElementSize
└─ lib/
   ├─ types.ts            Recipe / Ingredient / Category
   ├─ bookLayout.ts       recipes → ordered pages, ToC, tab targets (pure)
   └─ storage/            RecipeRepository interface + local and Supabase adapters
supabase/schema.sql       table, row-level security and image bucket
```

## How the book is laid out

`lib/bookLayout.ts` turns the recipe list into pages:

| Page          | Content                                          |
| ------------- | ------------------------------------------------ |
| 0             | Front cover (hard, shown alone)                  |
| 1 … T         | Table of contents (padded to an even count)      |
| odd / even    | Each recipe: left page (photo, ingredients) + right page (method, chef's notes) |
| last          | Back cover                                       |

Every recipe starts on an odd (left-hand) page, so it always opens as a full
spread. Recipes are grouped by category, so a tab simply points at the first
recipe of its section.

## Using Supabase

1. Create a project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Restart `npm run dev`.

The sample policies let anyone read and add recipes. Tighten the insert
policies (for example `to authenticated`) before you open the site to the public.

### Other backends

Implement the `RecipeRepository` interface in `src/lib/storage/types.ts`
(`list()` and `create()`), and return your implementation from
`getRecipeRepository()` in `src/lib/storage/index.ts`. The UI doesn't need to change.

## Notes for contributors

- `react-pageflip` reads its settings once, so `BookApp` remounts the book
  (via `key`) when the size, orientation or page count changes.
- The flip engine only lets clicks through when the event target *is* a
  `<button>` or `<a>`. Buttons inside pages give their children
  `pointer-events: none` (see the contents links).
- `reactStrictMode` is off because the engine does not survive React's
  dev-only double mount.

## License

MIT
