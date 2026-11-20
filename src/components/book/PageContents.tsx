"use client";

import { useState, type ReactNode } from "react";
import type { TocLine } from "@/lib/bookLayout";
import { SECTION_PROFILE, formatDuration } from "@/lib/sectionProfiles";
import { CATEGORY_LABEL, type Recipe } from "@/lib/types";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" className={`h-3 w-28 text-ink-faint ${className}`} aria-hidden>
      <path d="M0 6h48M72 6h48" stroke="currentColor" strokeWidth=".8" />
      <path d="M60 1l5 5-5 5-5-5z" fill="none" stroke="currentColor" strokeWidth=".8" />
      <circle cx="51" cy="6" r="1.2" fill="currentColor" />
      <circle cx="69" cy="6" r="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * A button that works inside a page. page-flip only lets a click through
 * when the event target itself is a <button>, so children must not catch it.
 */
function PageButton({
  onClick,
  className = "",
  children,
  label,
}: {
  onClick: () => void;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`[&_*]:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ covers */

export function FrontCover({ count }: { count: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="cover-frame flex h-full w-full flex-col items-center justify-center gap-[3%] px-[6%]">
        <p className="font-sans text-[clamp(11px,3cqw,16px)] font-semibold text-gilt/85">
          ספר המתכונים הרשמי של
        </p>
        <h1 className="gilt-text font-serif text-[clamp(30px,11cqw,72px)] font-black leading-[1.02]">
          טורפים
          <br />
          את המטבח
        </h1>
        <p className="text-[clamp(24px,8cqw,46px)] leading-none" aria-hidden>
          🌶️🔥
        </p>
        <Ornament className="!w-32 !text-gilt/70" />
        <p className="font-serif text-[clamp(12px,3.2cqw,18px)] text-gilt/85">
          {count === 1 ? "מתכון חם אחד" : `${count} מתכונים חמים`}, ישר מהמטבח
        </p>
        <p className="mt-[6%] font-sans text-[clamp(10px,2.4cqw,13px)] text-gilt/60">
          פתחו את הספר &larr;
        </p>
      </div>
    </div>
  );
}

export function BackCover() {
  return (
    <div className="flex h-full flex-col items-center justify-end p-[12%] text-center">
      <p className="font-serif text-base text-gilt/75">בתיאבון! 🌶️</p>
      <p className="mt-1 font-sans text-xs text-gilt/50">טורפים את המטבח · ספר מתכונים בקוד פתוח</p>
    </div>
  );
}

export function Endpaper() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="font-serif text-xl text-ink-soft">הספר הזה שייך ל…</p>
      <div className="h-px w-1/2 bg-ink-faint/50" />
      <p className="font-hand text-4xl font-bold text-ink-soft/80">כל מי שרעב 🔥</p>
    </div>
  );
}

/* --------------------------------------------------------- table of contents */

export function TocPage({
  lines,
  sheet,
  onNavigate,
}: {
  lines: TocLine[];
  sheet: number;
  onNavigate: (page: number) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {sheet === 0 ? (
        <header className="mb-[6%] text-center">
          <h2 className="font-serif text-[clamp(26px,8cqw,44px)] font-bold text-ink">תוכן העניינים</h2>
          <Ornament className="mx-auto mt-2" />
        </header>
      ) : (
        <p className="mb-[4%] text-center font-serif text-sm text-ink-faint">תוכן העניינים, המשך</p>
      )}

      <ol className="flex flex-col gap-[1.1cqh]">
        {lines.map((line) =>
          line.type === "category" ? (
            <li
              key={`c-${line.category}`}
              className="mt-[1.6cqh] font-sans text-[clamp(11px,2.6cqw,14px)] font-bold text-leather first:mt-0"
            >
              {CATEGORY_LABEL[line.category]}
            </li>
          ) : (
            <li key={line.recipe.id}>
              <PageButton
                onClick={() => onNavigate(line.page)}
                className="group flex w-full items-baseline gap-2 text-start"
              >
                <span className="font-serif text-[clamp(14px,3.4cqw,20px)] text-ink transition-colors group-hover:text-leather">
                  {line.recipe.title}
                </span>
                <span className="toc-leader flex-1" aria-hidden />
                <span className="font-serif text-[clamp(13px,3cqw,18px)] tabular-nums text-ink-soft">
                  {line.page}
                </span>
              </PageButton>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------- recipes */

/**
 * The dish's photos on the page: the current one fills the frame, arrows and
 * dots switch between them, and a tap opens the full-screen viewer.
 */
function RecipePhotos({ recipe, onView }: { recipe: Recipe; onView: PageActions["onViewPhotos"] }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const images = recipe.images.filter((url) => !failed[url]);
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(0, images.length - 1));

  if (!images.length) {
    return (
      <div className="photo-frame flex aspect-[16/10] max-h-[34cqh] w-full shrink-0 items-center justify-center bg-paper-dark">
        <svg viewBox="0 0 64 64" className="h-1/3 text-ink-faint/60" aria-hidden>
          <circle cx="32" cy="34" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="32" cy="34" r="13" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M8 10v14a4 4 0 0 0 8 0V10M12 10v44M54 10c-4 2-6 8-6 16h6v28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  const many = images.length > 1;
  const go = (by: number) => setIndex((current + by + images.length) % images.length);

  return (
    <div className="photo-frame relative aspect-[16/10] max-h-[34cqh] w-full shrink-0 overflow-hidden">
      <PageButton
        label={many ? `הגדלת תמונה ${current + 1} מתוך ${images.length}` : "הגדלת התמונה"}
        onClick={() => onView(images, current, recipe.title)}
        className="block h-full w-full cursor-zoom-in"
      >
        <img
          key={images[current]}
          src={images[current]}
          alt={recipe.title}
          loading="lazy"
          draggable={false}
          onError={() => setFailed((f) => ({ ...f, [images[current]]: true }))}
          className="h-full w-full object-cover"
        />
      </PageButton>
      {many && (
        <>
          {/* Right-to-left: the next photo is to the left. */}
          <PageButton label="התמונה הקודמת" onClick={() => go(-1)} className="photo-nav absolute right-1.5 top-1/2 -translate-y-1/2">
            ›
          </PageButton>
          <PageButton label="התמונה הבאה" onClick={() => go(1)} className="photo-nav absolute left-1.5 top-1/2 -translate-y-1/2">
            ‹
          </PageButton>
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center gap-1" aria-hidden>
            {images.map((url, i) => (
              <span
                key={url}
                className={`h-1.5 rounded-full bg-white shadow transition-all ${i === current ? "w-4" : "w-1.5 opacity-60"}`}
              />
            ))}
          </div>
          <span className="pointer-events-none absolute end-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 font-sans text-[11px] font-bold text-white">
            📷 {current + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

export interface PageActions {
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  /** Open the full-screen photo viewer. */
  onViewPhotos: (images: string[], index: number, title: string) => void;
}

/**
 * The recipe's numbers, named for its section: a bread shows
 * "הכנה · התפחה · אפייה · יחידות", a soup "הכנה · בישול · מנות".
 * Stages with no time are left out.
 */
function RecipeFacts({ recipe }: { recipe: Recipe }) {
  const profile = SECTION_PROFILE[recipe.category];
  const facts: [string, string][] = profile.times
    .filter((spec) => (recipe[spec.field] ?? 0) > 0)
    .map((spec) => [spec.label, formatDuration(recipe[spec.field] ?? 0)]);
  facts.push([profile.yieldLabel, String(recipe.servings)]);
  return (
    <dl
      className="my-[3.5%] grid border-y border-ink-faint/30 py-[2%] text-center font-sans"
      style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}
    >
      {facts.map(([k, v]) => (
        <div key={k} className="border-ink-faint/30 px-1 [&:not(:first-child)]:border-s">
          <dt className="text-[clamp(10px,2cqw,12px)] text-ink-faint">{k}</dt>
          <dd className="text-[clamp(11px,2.5cqw,15px)] font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** First page of a recipe (in reading order): title, uploader, photo, ingredients. */
export function RecipeFirst({
  recipe,
  isOwner,
  actions,
}: {
  recipe: Recipe;
  isOwner: boolean;
  actions: PageActions;
}) {
  return (
    <article className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <p className="font-sans text-[clamp(10px,2.3cqw,13px)] font-bold text-leather">
          {CATEGORY_LABEL[recipe.category]}
        </p>
        {isOwner && (
          <div className="flex shrink-0 gap-1.5">
            <PageButton
              label="עריכת המתכון"
              onClick={() => actions.onEdit(recipe)}
              className="owner-btn"
            >
              <span aria-hidden>✏️</span>
              <span>עריכה</span>
            </PageButton>
            <PageButton
              label="מחיקת המתכון"
              onClick={() => actions.onDelete(recipe)}
              className="owner-btn owner-btn--danger"
            >
              <span aria-hidden>🗑️</span>
              <span>מחיקה</span>
            </PageButton>
          </div>
        )}
      </div>
      <h2 className="mt-1 font-serif text-[clamp(22px,6.6cqw,40px)] font-bold leading-[1.1] text-ink">
        {recipe.title}
      </h2>
      <p className="mt-1 font-sans text-[clamp(11px,2.6cqw,15px)] text-ink-soft">
        הועלה על ידי <strong className="font-semibold text-ink">{recipe.author}</strong>
        <span className="text-ink-faint"> · {fmtDate(recipe.createdAt)}</span>
        {recipe.updatedAt && <span className="text-ink-faint"> · עודכן</span>}
      </p>

      <RecipeFacts recipe={recipe} />

      <RecipePhotos recipe={recipe} onView={actions.onViewPhotos} />

      <h3 className="mb-[1.5%] mt-[4%] font-serif text-[clamp(15px,3.8cqw,22px)] font-bold text-ink">
        מצרכים
      </h3>
      <ul className="page-scroll min-h-0 flex-1 font-sans text-[clamp(12px,2.6cqw,15px)] leading-snug text-ink-soft">
        {recipe.ingredients.map((ing, i) => (
          <li key={i} className="mb-[.4em] flex gap-2">
            <span className="mt-[.55em] h-1 w-1 shrink-0 rounded-full bg-leather/70" aria-hidden />
            <span>
              {ing.quantity && <strong className="font-semibold text-ink">{ing.quantity} </strong>}
              {ing.name}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** Second page of a recipe: method and chef's notes. */
export function RecipeSecond({ recipe }: { recipe: Recipe }) {
  return (
    <article className="flex h-full flex-col">
      {recipe.description && (
        <p className="mb-[4%] font-serif text-[clamp(14px,3.3cqw,19px)] leading-snug text-ink-soft">
          ״{recipe.description}״
        </p>
      )}
      <h3 className="mb-[2%] font-serif text-[clamp(15px,3.8cqw,22px)] font-bold text-ink">
        אופן ההכנה
      </h3>
      <ol className="page-scroll min-h-0 flex-1 space-y-[.75em] font-sans text-[clamp(12px,2.6cqw,15px)] leading-relaxed text-ink-soft">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-[1.4em] shrink-0 text-start font-serif text-[1.35em] font-bold leading-[1.1] text-leather">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {recipe.chefsNotes && (
        <aside className="chefs-note relative mt-[4%] rotate-[1deg] p-[4%] pt-[5%]">
          <span className="tape" aria-hidden />
          <p className="font-sans text-[clamp(10px,2cqw,12px)] font-bold text-ink-faint">טיפ מהשף</p>
          <p className="mt-1 font-hand text-[clamp(18px,4.6cqw,28px)] font-bold leading-tight text-ink">
            {recipe.chefsNotes}
          </p>
        </aside>
      )}
    </article>
  );
}
