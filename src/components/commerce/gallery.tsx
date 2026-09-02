"use client";

import { useState } from "react";
import { TiltCard } from "@/components/motion/tilt-card";

interface Props {
  images: { src: string; alt: string }[];
}

/** Swipeable, keyboard-navigable gallery; thumbnails below on desktop. */
export function Gallery({ images }: Props) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;
  const current = images[Math.min(index, images.length - 1)] as { src: string; alt: string };

  return (
    <figure
      className="relative"
      onTouchStart={(e) => {
        const startX = e.touches[0]?.clientX ?? 0;
        const el = e.currentTarget;
        const onEnd = (end: TouchEvent) => {
          const dx = (end.changedTouches[0]?.clientX ?? 0) - startX;
          if (Math.abs(dx) > 48) {
            setIndex((i) => (dx < 0 ? Math.min(i + 1, images.length - 1) : Math.max(i - 1, 0)));
          }
          el.removeEventListener("touchend", onEnd);
        };
        el.addEventListener("touchend", onEnd);
      }}
    >
      <TiltCard max={3} className="emerge-on-load">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.alt}
          className="aspect-[4/5] w-full border border-white/10 object-cover shadow-[0_36px_72px_rgba(17,14,10,0.16)]"
        />
      </TiltCard>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-obsidian/70 text-ivory transition hover:bg-obsidian disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
            disabled={index === images.length - 1}
            aria-label="Next image"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-obsidian/70 text-ivory transition hover:bg-obsidian disabled:opacity-30"
          >
            ›
          </button>
        </>
      )}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2" role="tablist" aria-label="Image thumbnails">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-16 w-14 overflow-hidden border transition-colors ${
                i === index ? "border-gold" : "border-gold/20 hover:border-gold/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
