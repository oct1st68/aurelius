"use client";

import { useEffect, useState } from "react";

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  model: string;
  brand: string;
  price: string;
  image: string;
}

const KEY = "aurelius_recently_viewed";
const MAX = 8;

/**
 * Client-side preference storage (localStorage) — appropriate here because
 * recently-viewed is a display convenience, never business data. The primary
 * backend remains the server JSON store.
 */
export function RecentlyViewedTracker({ watch }: { watch: RecentlyViewedItem }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const list: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((item) => item.id !== watch.id);
      const next = [watch, ...filtered].slice(0, MAX);
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable (private mode) — feature is optional */
    }
  }, [watch]);
  return null;
}

export function RecentlyViewedRail() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  useEffect(() => {
    setItems(readList());
  }, []);
  if (items.length < 2) return null;
  return (
    <section aria-labelledby="rv-heading" className="mt-16 border-t hairline pt-10">
      <h2 id="rv-heading" className="eyebrow">
        Recently Viewed
      </h2>
      <ul className="mt-6 flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <li key={item.id} className="w-40 shrink-0">
            <a href={`/watches/${item.slug}`} className="group block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/media/${item.image}`}
                alt={item.model}
                loading="lazy"
                className="aspect-[4/5] w-full border border-gold/15 object-cover"
              />
              <p className="mt-2 truncate text-sm text-ivory group-hover:text-gold">{item.model}</p>
              <p className="text-xs text-bronze">{item.price}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function readList(): RecentlyViewedItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : [];
  } catch {
    return [];
  }
}
