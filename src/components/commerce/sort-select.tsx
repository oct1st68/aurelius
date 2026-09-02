"use client";

import { useRouter } from "next/navigation";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "year_asc", label: "Year ↑" },
  { value: "year_desc", label: "Year ↓" },
];

export function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-[10px] uppercase tracking-[0.25em] text-bronze">
        Sort
      </label>
      <select
        id="sort"
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(window.location.search);
          params.set("sort", e.target.value);
          params.delete("page");
          router.push(`/watches?${params.toString()}`);
        }}
        className="input-imperial !min-h-10 !w-auto py-1.5"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
