"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Museum-case tilt: ±5° 3D rotation following the pointer with a specular
 * sheen that tracks the light. Compositor-only (transform/opacity).
 * Disabled for touch pointers and prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className = "",
  max = 5,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const rotateX = useRef<((v: number) => void) | null>(null);
  const rotateY = useRef<((v: number) => void) | null>(null);
  const sheenX = useRef<((v: number) => void) | null>(null);
  const sheenY = useRef<((v: number) => void) | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (pointer: fine)", () => {
        const el = root.current;
        if (!el) return;
        const sheen = el.querySelector<HTMLElement>("[data-sheen]");
        rotateX.current = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" });
        rotateY.current = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });
        if (sheen) {
          sheenX.current = gsap.quickTo(sheen, "xPercent", { duration: 0.6, ease: "power3" });
          sheenY.current = gsap.quickTo(sheen, "yPercent", { duration: 0.6, ease: "power3" });
        }
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = root.current;
    if (!el || !rotateX.current || !rotateY.current) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateX.current(-py * max * 2);
    rotateY.current(px * max * 2);
    sheenX.current?.(px * 60);
    sheenY.current?.(py * 60);
  }

  function onLeave() {
    rotateX.current?.(0);
    rotateY.current?.(0);
    sheenX.current?.(0);
    sheenY.current?.(0);
  }

  return (
    <div
      ref={root}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`relative [transform-style:preserve-3d] [perspective:1200px] ${className}`}
      style={{ willChange: "transform" }}
    >
      {children}
      <div
        data-sheen
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [background:radial-gradient(38rem_38rem_at_50%_50%,rgba(255,255,255,0.16),transparent_60%)] group-hover:opacity-100"
      />
    </div>
  );
}
