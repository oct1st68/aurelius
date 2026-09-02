"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface Hit {
  type: "watch" | "brand" | "article";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function SearchButton() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (term.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (res.ok) {
          const data = (await res.json()) as { hits: Hit[] };
          setHits(data.hits);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [term, open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 border border-gold/25 px-3 text-xs uppercase tracking-[0.18em] text-travertine/70 transition-colors hover:border-gold/50 hover:text-gold"
        aria-label="Search (Command K)"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-gold/30 px-1.5 py-0.5 text-[10px] text-bronze md:inline">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-obsidian/80 p-4 pt-24 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search the empire"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="panel w-full max-w-xl shadow-2xl">
        <div className="flex items-center gap-3 border-b hairline px-4">
          <Search className="h-4 w-4 text-bronze" aria-hidden />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search watches, houses, archives…"
            aria-label="Search query"
            className="h-14 flex-1 bg-transparent text-sm text-ivory outline-none placeholder:text-travertine/40"
          />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close search">
            <X className="h-4 w-4 text-bronze hover:text-gold" />
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {loading && <li className="px-3 py-4 text-sm text-bronze">Searching…</li>}
          {!loading && term.trim().length >= 2 && hits.length === 0 && (
            <li className="px-3 py-4 text-sm text-bronze">Nothing found in the empire.</li>
          )}
          {!loading && term.trim().length < 2 && (
            <li className="px-3 py-4 text-sm text-bronze">
              Type at least two characters. Try “tourbillon”, “diver”, “Helios”.
            </li>
          )}
          {hits.map((hit) => (
            <li key={`${hit.type}-${hit.id}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-gold/10"
                onClick={() => {
                  setOpen(false);
                  router.push(hit.href);
                }}
              >
                <span>
                  <span className="block text-sm text-ivory">{hit.title}</span>
                  <span className="block text-xs text-bronze">{hit.subtitle}</span>
                </span>
                <span className="badge">{hit.type}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
