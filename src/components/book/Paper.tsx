import { forwardRef, type ReactNode } from "react";

export type PageSide = "left" | "right" | "single";

interface PaperProps {
  side: PageSide;
  /** "hard" pages (covers) flip stiffly like board, "soft" ones curl. */
  density?: "hard" | "soft";
  variant?: "paper" | "cover" | "endpaper";
  /** Printed folio number. Hidden when undefined. */
  folio?: number;
  children: ReactNode;
}

/**
 * One physical page. react-pageflip needs each child to be a DOM element it
 * can take a ref to, so every page in the book is wrapped in this.
 */
export const Paper = forwardRef<HTMLDivElement, PaperProps>(function Paper(
  { side, density = "soft", variant = "paper", folio, children },
  ref,
) {
  return (
    <div ref={ref} data-density={density} className="page-shell">
      <div className={`page page--${variant} page--${side}`}>
        <div className="page__content">{children}</div>
        {folio !== undefined && variant === "paper" && (
          <span className={`page__folio page__folio--${side}`}>{folio}</span>
        )}
      </div>
    </div>
  );
});
