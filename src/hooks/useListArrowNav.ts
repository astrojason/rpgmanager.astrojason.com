"use client";

import { useEffect } from "react";

export interface UseListArrowNavConfig<T> {
  items: T[];
  selected: T | null;
  getId: (item: T) => string;
  /** Attribute (e.g. 'data-faction-id') used to scroll the newly-selected row into view. */
  dataAttr: string;
  onSelect: (item: T) => void;
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el as HTMLElement).closest) return false;
  return !!(el as HTMLElement).closest('input, textarea, select, [contenteditable="true"]');
}

/** Arrow-key up/down navigation through a list panel, shared by the admin CRUD pages. */
export function useListArrowNav<T>({ items, selected, getId, dataAttr, onSelect }: UseListArrowNavConfig<T>) {
  useEffect(() => {
    const moveSelection = (delta: number) => {
      if (items.length === 0) return;
      const idx = selected ? items.findIndex((item) => getId(item) === getId(selected)) : -1;
      const nextIdx = idx === -1 ? (delta > 0 ? 0 : items.length - 1) : idx + delta;
      if (idx !== -1 && (nextIdx < 0 || nextIdx >= items.length)) return;
      const next = items[nextIdx];
      if (!next) return;
      onSelect(next);
      setTimeout(() => {
        document.querySelector(`[${dataAttr}="${getId(next)}"]`)?.scrollIntoView({ block: "nearest" });
      }, 0);
    };

    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selected, getId, dataAttr, onSelect]);
}
