"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const HOUSES = [
  "Constantin Helios",
  "Aurelius & Fils",
  "Meridian & Söhne",
  "House of Janus",
  "Saturn & Co.",
  "Olympia Chronométrie",
  "Trajan Instruments",
  "Minerva Horologie",
  "Vestal & Roma",
  "Aquilia Fabrica",
];

/**
 * The Rotunda — a slow CSS-3D carousel of the ten Great Houses.
 * Pure transforms (rotateY + translateZ); pauses on hover; static under
 * prefers-reduced-motion.
 */
export function NumeralRotunda() {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.to(ring.current, {
          rotationY: "+=360",
          duration: 60,
          ease: "none",
          repeat: -1,
        });
        const el = root.current;
        el?.addEventListener("pointerenter", () => tween.timeScale(0.12));
        el?.addEventListener("pointerleave", () => tween.timeScale(1));
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const radius = 340;

  return (
    <div
      ref={root}
      className="relative h-[300px] overflow-hidden [perspective:1400px] sm:h-[340px]"
      aria-label="The ten Great Houses"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-limestone to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-limestone to-transparent" />
      <div
        ref={ring}
        className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
        style={{ willChange: "transform" }}
      >
        {HOUSES.map((house, index) => {
          const angle = (360 / HOUSES.length) * index;
          return (
            <div
              key={house}
              className="absolute -ml-28 -mt-12 flex h-24 w-56 items-center justify-center border border-white/10 bg-limestone/85 backdrop-blur-sm"
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                backfaceVisibility: "hidden",
              }}
            >
              <span className="px-4 text-center font-serif-lux text-lg leading-tight text-bone">
                {house}
              </span>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <p className="eyebrow text-center">The ten houses · one standard</p>
      </div>
    </div>
  );
}
