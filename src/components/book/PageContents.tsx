"use client";

import { useState } from "react";
import type { TocLine } from "@/lib/bookLayout";
import type { Recipe } from "@/lib/types";

const fmtMinutes = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;

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

/* ------------------------------------------------------------------ covers */

export function FrontCover({ count }: { count: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-[10%] text-center">
      <div className="cover-frame flex h-full w-full flex-col items-center justify-center gap-[3%]">
        <p className="font-sans text-[clamp(9px,1.4cqw+4px,13px)] uppercase tracking-[.4em] text-gilt/80">
          A Collection of
        </p>
        <h1 className="gilt-text font-serif text-[clamp(28px,9cqw,64px)] font-bold italic leading-[1.05]">
          Kitchen
          <br />
          Stories
        </h1>
        <Ornament className="!w-32 !text-gilt/70" />
        <p className="font-serif text-[clamp(11px,2.6cqw,17px)] italic text-gilt/80">
          {count} recipes, handed down &amp; passed around
        </p>
        <p className="mt-[8%] font-sans text-[clamp(8px,1.6cqw,11px)] uppercase tracking-[.3em] text-gilt/60">
          Open the book &rarr;
        </p>
      </div>
    </div>
  );
}

export function BackCover() {
  return (
    <div className="flex h-full flex-col items-center justify-end p-[12%] text-center">
      <p className="font-serif text-sm italic text-gilt/70">Made with love &amp; butter.</p>
      <p className="mt-1 font-sans text-[10px] uppercase tracking-[.3em] text-gilt/50">
        Open-source cookbook
      </p>
    </div>
  );
}

export function Endpaper() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="font-serif text-lg italic text-ink-soft">This book belongs to</p>
      <div className="h-px w-1/2 bg-ink-faint/50" />
      <p className="font-hand text-3xl text-ink-soft/70">every hungry friend</p>
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
          <h2 className="font-serif text-[clamp(24px,7cqw,40px)] font-semibold tracking-wide text-ink">
            Contents
          </h2>
          <Ornament className="mx-auto mt-2" />
        </header>
      ) : (
        <p className="mb-[4%] text-center font-serif text-sm italic text-ink-faint">
          Contents, continued
        </p>
      )}

      <ol className="flex flex-col gap-[1.1cqh]">
        {lines.map((line) =>
          line.type === "category" ? (
            <li
              key={`c-${line.category}`}
              className="mt-[1.6cqh] font-sans text-[clamp(9px,1.9cqw,12px)] font-semibold uppercase tracking-[.25em] text-leather first:mt-0"
            >
              {line.category}
            </li>
          ) : (
            <li key={line.recipe.id}>
              {/* page-flip forwards clicks only when the event target itself is a
                  <button>, so the inner spans must not catch the pointer. */}
              <button
                type="button"
                onClick={() => onNavigate(line.page)}
                className="toc-link group flex w-full items-baseline gap-2 text-left [&_*]:pointer-events-none"
              >
                <span className="font-serif text-[clamp(13px,3.1cqw,19px)] text-ink transition-colors group-hover:text-leather">
                  {line.recipe.title}
                </span>
                <span className="toc-leader flex-1" aria-hidden />
                <span className="font-serif text-[clamp(12px,2.8cqw,17px)] tabular-nums text-ink-soft">
                  {line.page}
                </span>
              </button>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------------- recipes */

function RecipeImage({ recipe }: { recipe: Recipe }) {
  const [failed, setFailed] = useState(false);
  if (!recipe.imageUrl || failed) {
    return (
      <div className="photo-frame flex aspect-[16/10] max-h-[34cqh] w-full items-center justify-center bg-paper-dark">
        <svg viewBox="0 0 64 64" className="h-1/3 text-ink-faint/60" aria-hidden>
          <circle cx="32" cy="34" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="32" cy="34" r="13" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M8 10v14a4 4 0 0 0 8 0V10M12 10v44M54 10c-4 2-6 8-6 16h6v28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="photo-frame aspect-[16/10] max-h-[34cqh] w-full shrink-0 overflow-hidden">
      <img
        src={recipe.imageUrl}
        alt={recipe.title}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function RecipeLeft({ recipe }: { recipe: Recipe }) {
  return (
    <article className="flex h-full flex-col">
      <p className="font-sans text-[clamp(8px,1.7cqw,11px)] font-semibold uppercase tracking-[.3em] text-leather">
        {recipe.category}
      </p>
      <h2 className="mt-1 font-serif text-[clamp(20px,6cqw,36px)] font-semibold leading-[1.1] text-ink">
        {recipe.title}
      </h2>
      <p className="mt-1 font-serif text-[clamp(11px,2.5cqw,15px)] italic text-ink-soft">
        by {recipe.author}
      </p>

      <dl className="my-[3.5%] grid grid-cols-3 border-y border-ink-faint/30 py-[2%] text-center font-sans">
        {[
          ["Prep", fmtMinutes(recipe.prepTime)],
          ["Cook", fmtMinutes(recipe.cookTime)],
          ["Serves", String(recipe.servings)],
        ].map(([k, v]) => (
          <div key={k} className="border-ink-faint/30 [&:not(:first-child)]:border-l">
            <dt className="text-[clamp(8px,1.5cqw,10px)] uppercase tracking-[.2em] text-ink-faint">{k}</dt>
            <dd className="text-[clamp(11px,2.4cqw,14px)] font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <RecipeImage recipe={recipe} />

      <h3 className="mb-[1.5%] mt-[4%] font-serif text-[clamp(14px,3.4cqw,20px)] font-semibold text-ink">
        Ingredients
      </h3>
      <ul className="page-scroll min-h-0 flex-1 font-sans text-[clamp(11px,2.35cqw,14px)] leading-snug text-ink-soft">
        {recipe.ingredients.map((ing, i) => (
          <li key={i} className="mb-[.4em] flex break-inside-avoid gap-2">
            <span className="mt-[.5em] h-1 w-1 shrink-0 rounded-full bg-leather/70" aria-hidden />
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

export function RecipeRight({ recipe }: { recipe: Recipe }) {
  return (
    <article className="flex h-full flex-col">
      {recipe.description && (
        <p className="mb-[4%] font-serif text-[clamp(13px,3cqw,18px)] italic leading-snug text-ink-soft">
          &ldquo;{recipe.description}&rdquo;
        </p>
      )}
      <h3 className="mb-[2%] font-serif text-[clamp(14px,3.4cqw,20px)] font-semibold text-ink">
        Method
      </h3>
      <ol className="page-scroll min-h-0 flex-1 space-y-[.75em] font-sans text-[clamp(11px,2.35cqw,14px)] leading-relaxed text-ink-soft">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-[1.4em] shrink-0 text-right font-serif text-[1.35em] font-semibold leading-[1.1] text-leather">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {recipe.chefsNotes && (
        <aside className="chefs-note relative mt-[4%] rotate-[-1deg] p-[4%] pt-[5%]">
          <span className="tape" aria-hidden />
          <p className="font-sans text-[clamp(8px,1.5cqw,10px)] font-semibold uppercase tracking-[.25em] text-ink-faint">
            Chef&rsquo;s notes
          </p>
          <p className="mt-1 font-hand text-[clamp(15px,3.6cqw,22px)] leading-tight text-ink">
            {recipe.chefsNotes}
          </p>
        </aside>
      )}
    </article>
  );
}
