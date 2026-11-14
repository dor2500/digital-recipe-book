"use client";

import { useEffect, useRef, useState } from "react";

/** Debounced content-box size of an element. */
export function useElementSize<T extends HTMLElement>(delay = 120) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) =>
        Math.abs(s.width - r.width) < 1 && Math.abs(s.height - r.height) < 1
          ? s
          : { width: r.width, height: r.height },
      );
    };
    measure();
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, delay);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [delay]);

  return [ref, size] as const;
}
