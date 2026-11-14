"use client";

import {
  useCallback,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactElement,
  type Ref,
} from "react";
import HTMLFlipBook from "react-pageflip";
import type { BookLayout, PageSpec } from "@/lib/bookLayout";
import { Paper, type PageSide } from "./Paper";
import {
  BackCover,
  Endpaper,
  FrontCover,
  RecipeLeft,
  RecipeRight,
  TocPage,
} from "./PageContents";

/** Portrait page proportions, roughly a real cookbook (≈ 7.5 × 10 in). */
export const PAGE_RATIO = 0.75;

/** The subset of page-flip's PageFlip instance we use. */
interface PageFlipApi {
  flip(page: number, corner?: "top" | "bottom"): void;
  turnToPage(page: number): void;
  flipNext(corner?: "top" | "bottom"): void;
  flipPrev(corner?: "top" | "bottom"): void;
  getCurrentPageIndex(): number;
  getPageCount(): number;
}

export interface BookHandle {
  /** Animate to a page index. Far jumps flip one sheet then land on the target. */
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
  startPage: number;
  onPageChange: (page: number) => void;
  /** Fired once page-flip has laid out the pages and can take commands. */
  onReady?: () => void;
}

/**
 * The flipping book itself.
 *
 * Sizing strategy: the parent measures the free space and passes an exact
 * `pageWidth`. We run page-flip in "stretch" mode inside a box of exactly one
 * spread (or one page in portrait), with min/max widths pinned so page-flip's
 * own layout maths lands on the same numbers. That lets the bookmark tabs and
 * the book base sit flush against the real page edges.
 *
 * page-flip reads its settings only once, so the parent remounts this
 * component (via `key`) when the size, orientation or page count changes,
 * passing the current page as `startPage`.
 */
export function Book({
  controlRef,
  layout,
  pageWidth,
  portrait,
  startPage,
  onPageChange,
  onReady,
}: BookProps) {
  const flipRef = useRef<{ pageFlip(): PageFlipApi | undefined } | null>(null);
  const api = () => flipRef.current?.pageFlip();

  useImperativeHandle(controlRef, () => ({
    flipTo(page) {
      const pf = api();
      if (!pf) return;
      const current = pf.getCurrentPageIndex();
      // In a spread, the current index can be either page of the pair.
      const sameSpread = !portrait && current !== 0 && Math.ceil(current / 2) === Math.ceil(page / 2);
      if (page === current || sameSpread) return;
      pf.flip(page, "top");
    },
    next: () => api()?.flipNext("bottom"),
    prev: () => api()?.flipPrev("bottom"),
  }));

  const pageHeight = Math.round(pageWidth / PAGE_RATIO);
  const sideOf = (index: number): PageSide =>
    portrait ? "single" : index % 2 === 1 ? "left" : "right";

  const navigate = useCallback(
    (page: number) => flipRef.current?.pageFlip()?.flip(page, "top"),
    [],
  );

  const renderPage = (spec: PageSpec, i: number): ReactElement => {
    const side = sideOf(i);
    switch (spec.kind) {
      case "cover":
        return (
          <Paper key="cover" side="right" density="hard" variant="cover">
            <FrontCover count={layout.recipes.length} />
          </Paper>
        );
      case "back-cover":
        return (
          <Paper key="back" side="left" density="hard" variant="cover">
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
          <Paper key={`toc-${spec.sheet}`} side={side} folio={i}>
            <TocPage lines={spec.lines} sheet={spec.sheet} onNavigate={navigate} />
          </Paper>
        );
      case "recipe-left":
        return (
          <Paper key={`${spec.recipe.id}-l`} side={side} folio={i}>
            <RecipeLeft recipe={spec.recipe} />
          </Paper>
        );
      case "recipe-right":
        return (
          <Paper key={`${spec.recipe.id}-r`} side={side} folio={i}>
            <RecipeRight recipe={spec.recipe} />
          </Paper>
        );
    }
  };

  const boxStyle: CSSProperties = {
    width: portrait ? pageWidth : pageWidth * 2,
    height: pageHeight,
  };

  return (
    <HTMLFlipBook
      ref={flipRef}
      className="flipbook"
      style={boxStyle}
      startPage={startPage}
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
      onFlip={(e: { data: number }) => onPageChange(e.data)}
      onInit={() => onReady?.()}
    >
      {layout.pages.map(renderPage)}
    </HTMLFlipBook>
  );
}
