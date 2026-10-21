"use client";
import { useEffect, useRef } from "react";

export function useDismissibleDetails() {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const details = ref.current;
      if (details?.open && !details.contains(event.target as Node))
        details.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      const details = ref.current;
      if (event.key !== "Escape" || !details?.open) return;
      const restoreFocus = details.contains(document.activeElement);
      details.open = false;
      if (restoreFocus) details.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return ref;
}
