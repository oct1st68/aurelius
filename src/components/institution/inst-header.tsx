"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/watches", label: "Collection" },
  { href: "/certificate", label: "Provenance" },
  { href: "/houses", label: "Houses" },
  { href: "/archives", label: "Journal" },
];

/**
 * Institution header: transparent over the opening image, coal after scroll.
 * Menu is a full-screen overlay on small viewports; Escape closes and focus
 * returns to the toggle.
 */
export function InstHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? "bg-coal/95" : "bg-transparent"
      }`}
      style={{ borderBottom: "1px solid rgba(117, 96, 71, 0.24)" }}
    >
      <div className="mx-auto flex h-16 max-w-[110rem] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          aria-label="AURELIUS — private horology"
          className="font-display text-[15px] font-medium tracking-[0.34em] text-bone"
        >
          AURELIUS
        </Link>

        <nav aria-label="Institution" className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] tracking-[0.08em] text-ash transition-colors duration-300 hover:text-bone"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/register"
            className="border px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-bone transition-colors duration-300 hover:bg-oxblood hover:border-oxblood"
            style={{ borderColor: "rgba(117, 96, 71, 0.45)" }}
          >
            Request access
          </Link>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls="inst-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center text-bone md:hidden"
        >
          <span aria-hidden className="text-lg leading-none">{open ? "×" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div
          id="inst-menu"
          ref={panelRef}
          className="fixed inset-0 top-16 z-40 bg-void md:hidden"
        >
          <nav aria-label="Institution menu" className="flex h-full flex-col px-6 pb-10 pt-10">
            {NAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b py-6 font-serif-lux text-3xl text-bone"
                style={{ borderColor: "rgba(117, 96, 71, 0.25)" }}
              >
                <span className="mr-4 font-sans text-[11px] tracking-[0.14em] text-ash">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.label}
              </Link>
            ))}
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="mt-auto bg-oxblood py-4 text-center text-[13px] uppercase tracking-[0.16em] text-bone"
            >
              Request access
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
