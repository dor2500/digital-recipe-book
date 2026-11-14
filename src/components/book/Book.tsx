"use client";

import { useCallback, useImperativeHandle, useRef, type CSSProperties, type ReactElement, type Ref } from "react";
import HTMLFlipBook from "react-pageflip";
import type { BookLayout, PageSpec } from "@/lib/bookLayout";
import { Paper, type PageSide } from "./Paper";
import {
  BackCover,
  Endpaper,
  FrontCover,
  RecipeFirst,
  RecipeSecond,
  TocPage,
  type OwnerActions,
} from "./PageContents";

/** Portrait page proportions, roughly a real cookbook (≈ 7.5 × 10 in). */
export const PAGE_RATIO = 0.75;

/** The subset of page-flip's PageFlip instance we use. */
interface PageFlipApi {
  flip(page: number, corner?: "top" | "bottom"): void;
  flipNext(corner?: "top" | "bottom"): void;
  flipPrev(corner?: "top" | "bottom"): void;
  getCurrentPageIndex(): number;
}

/** All page numbers here are in reading order. */
export interface BookHandle {
  flipTo(page: number): void;
  next(): void;
  prev(): void;
}

interface BookProps {
  /**
   * Imperative controls. A prop rather than `ref` because the parent loads
   * this component with next/dynamic, which does not forward refs.
   */
  controlRef: Ref<BookHandle>;
  layout: BookLayout;
  /** Rendered page width in px; the parent computed it to fit the viewport. */
  pageWidth: number;
  portrait: boolean;
  /** Reading-order page to open on. */
  startPage: number;
  /** Reports the first page of the visible spread, in reading order. */
  onPageChange: (page: number) => void;
  /** Fired once page-flip has laid out the pages and can take commands. */
  onReady?: () => void;
  viewerId: string | null;
  ownerActions: OwnerActions;
}

/**
 * The flipping book itself, bound right-to-left like a Hebrew book.
 *
 * page-flip only turns pages left-to-right, so we hand it the pages in
 * REVERSE and open it at the end. "Next page" is then its flipPrev(), which
 * peels the left-hand page over to the right. Everything outside this
 * component keeps using reading-order page numbers; toPhys/toReading convert.
 *
 * Sizing: the parent measures the free space and passes an exact `pageWidth`.
 * page-flip runs in "stretch" mode inside a box of exactly one spread (or one
 * page in portrait), with min/max widths pinned so its own maths lands on the
 * same numbers, so the tabs and the book base sit flush against the pages.
 *
 * page-flip reads its settings only once, so the parent remounts this
 * component (via `key`) when the size, orientation or pages change.
 */
export function Book({
  controlRef,
  layout,
  pageWidth,
  portrait,
  startPage,
  onPageChange,
  onReady,
  viewerId,
  ownerActions,
}: BookProps) {
  const flipRef = useRef<{ pageFlip(): PageFlipApi | undefined } | null>(null);
  const api = () => flipRef.current?.pageFlip();

  const last = layout.pages.length - 1;
  const toPhys = (page: number) => last - page;
  /** Physical index → first page (in reading order) of the spread it belongs to. */
  const toReading = (phys: number) => {
    const page = last - phys;
    // In a spread, pair (1,2), (3,4)…: report the odd one.
    return !portrait && page > 0 && page < last && page % 2 === 0 ? page - 1 : page;
  };

  const flipToReading = useCallback(
    (page: number) => {
      const pf = flipRef.current?.pageFlip();
      if (!pf) return;
      const target = Math.max(0, Math.min(last, page));
      const current = last - pf.getCurrentPageIndex();
      const spreadOf = (p: number) => (portrait || p === 0 || p === last ? `s${p}` : `p${Math.ceil(p / 2)}`);
      if (spreadOf(current) === spreadOf(target)) return;
      pf.flip(last - target, "top");
    },
    [last, portrait],
  );

  useImperativeHandle(controlRef, () => ({
    flipTo: flipToReading,
    next: () => api()?.flipPrev("bottom"),
    prev: () => api()?.flipNext("bottom"),
  }));

  const pageHeight = Math.round(pageWidth / PAGE_RATIO);
  // With showCover the engine pairs physical pages (1,2), (3,4)…: odd = left.
  const sideOf = (phys: number): PageSide => (portrait ? "single" : phys % 2 === 1 ? "left" : "right");

  const renderPage = (spec: PageSpec, page: number): ReactElement => {
    const side = sideOf(toPhys(page));
    switch (spec.kind) {
      case "cover":
        return (
          <Paper key="cover" side={portrait ? "single" : "left"} density="hard" variant="cover">
            <FrontCover count={layout.recipes.length} />
          </Paper>
        );
      case "back-cover":
        return (
          <Paper key="back" side="right" density="hard" variant="cover">
            <BackCover />
          </Paper>
        );
      case "endpaper":
        return (
          <Paper key="endpaper" side={side} variant="endpaper">
            <Endpaper />
          </Paper>
        );
      case "toc":
        return (
          <Paper key={`toc-${spec.sheet}`} side={side} folio={page}>
            <TocPage lines={spec.lines} sheet={spec.sheet} onNavigate={flipToReading} />
          </Paper>
        );
      case "recipe-first":
        return (
          <Paper key={`${spec.recipe.id}-1`} side={side} folio={page}>
            <RecipeFirst
              recipe={spec.recipe}
              isOwner={!!viewerId && spec.recipe.ownerId === viewerId}
              actions={ownerActions}
            />
          </Paper>
        );
      case "recipe-second":
        return (
          <Paper key={`${spec.recipe.id}-2`} side={side} folio={page}>
            <RecipeSecond recipe={spec.recipe} />
          </Paper>
        );
    }
  };

  const boxStyle: CSSProperties = {
    width: portrait ? pageWidth : pageWidth * 2,
    height: pageHeight,
  };

  // Physical order = reading order reversed.
  const physicalPages = layout.pages.map(renderPage).reverse();

  return (
    <HTMLFlipBook
      ref={flipRef}
      className="flipbook"
      style={boxStyle}
      startPage={toPhys(Math.max(0, Math.min(last, startPage)))}
      size="stretch"
      width={pageWidth}
      height={pageHeight}
      // Pin min/max so page-flip computes exactly `pageWidth` and picks the
      // orientation we asked for (it goes portrait when box < 2 × minWidth).
      minWidth={portrait ? pageWidth : 1}
      maxWidth={pageWidth}
      minHeight={1}
      maxHeight={pageHeight}
      usePortrait={portrait}
      showCover
      drawShadow
      maxShadowOpacity={0.45}
      flippingTime={850}
      startZIndex={0}
      autoSize={false}
      mobileScrollSupport
      clickEventForward
      useMouseEvents
      swipeDistance={30}
      showPageCorners
      disableFlipByClick={false}
      onFlip={(e: { data: number }) => onPageChange(toReading(e.data))}
      onInit={() => onReady?.()}
    >
      {physicalPages}
    </HTMLFlipBook>
  );
}
