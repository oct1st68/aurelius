"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { Brand } from "@/domain/entities";
import { FilterPanel } from "./filter-panel";

/** Mobile: bottom-sheet filters (slides up, focus-trapped by native dialog). */
export function MobileFilterButton({
  brands,
  current,
}: {
  brands: Brand[];
  current: Record<string, string | string[] | undefined>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-imperial !min-h-10 px-4 text-[11px]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filters
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-obsidian/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[80vh] w-full overflow-y-auto rounded-t-lg border-t border-gold/30 bg-obsidian-2 p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="font-display text-sm tracking-[0.25em] text-gold">FILTERS</p>
              <button type="button" onClick={() => setOpen(false)} className="btn-imperial !min-h-9 px-3 text-[10px]">
                Done
              </button>
            </div>
            <FilterPanel brands={brands} current={current} />
          </div>
        </div>
      )}
    </div>
  );
}
