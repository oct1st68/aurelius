"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowDownRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface CinematicHeroProps {
  image: string;
  imageAlt: string;
  brand: string;
  model: string;
  href: string;
}

export function CinematicHero({ image, imageAlt, brand, model, href }: CinematicHeroProps) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hide-then-reveal AFTER hydration so no-JS/slow-JS users never see a
        // blank hero (content is server-rendered visible; animation is an enhancement).
        gsap.set("[data-hero-meta], [data-hero-title], [data-hero-copy], [data-hero-watch], [data-hero-rail]", { autoAlpha: 0 });
        const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
        timeline
          .to("[data-hero-meta]", { autoAlpha: 1, y: 0, startAt: { y: 16 }, duration: 0.6 })
          .to("[data-hero-title]", { autoAlpha: 1, y: 0, startAt: { y: 28 }, duration: 0.9 }, "-=0.36")
          .to("[data-hero-copy]", { autoAlpha: 1, y: 0, startAt: { y: 14 }, duration: 0.58 }, "-=0.5")
          .to("[data-hero-watch]", { autoAlpha: 1, scale: 1, startAt: { scale: 0.975 }, duration: 1.05 }, "-=0.82")
          .to("[data-hero-rail]", { autoAlpha: 1, y: 0, startAt: { y: 10 }, duration: 0.5 }, "-=0.4");

        gsap.to("[data-hero-watch]", {
          yPercent: 10,
          scale: 1.05,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to("[data-hero-copy]", {
          yPercent: -18,
          autoAlpha: 0.35,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "70% top", scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative overflow-hidden bg-obsidian"
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(181,154,98,0.12),transparent_32%)]" />
      <div className="museum-shell relative grid items-center gap-10 pb-24 pt-12 sm:pt-16 lg:min-h-[calc(100svh-72px)] lg:grid-cols-12 lg:pb-28 lg:pt-8">
        <div className="relative z-10 lg:col-span-6 lg:self-end lg:pb-24">
          <p data-hero-meta className="eyebrow text-gold/70">
            Curated horology · Est. MMXXV
          </p>
          <h1 id="hero-title" data-hero-title className="display-title mt-6 text-ivory">
            AURELIUS
          </h1>
          <p data-hero-copy className="mt-7 max-w-xl font-serif-lux text-2xl leading-snug text-travertine/80 sm:text-3xl">
            Time is the only empire that never falls.
          </p>
          <div data-hero-copy className="mt-9 flex flex-wrap gap-3">
            <Link href="/watches" className="btn-imperial btn-solid">
              View the catalog
            </Link>
            <Link href="/saturn" className="btn-imperial btn-ghost">
              Explore vintage watches
            </Link>
          </div>
        </div>

        <Link
          data-hero-watch
          href={href}
          className="group relative mx-auto block w-full max-w-[36rem] lg:col-span-6 lg:max-w-none"
          aria-label={`View ${brand} ${model}`}
        >
          <div className="absolute inset-x-[12%] bottom-[3%] h-[15%] rounded-[50%] bg-black/60 blur-3xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={imageAlt}
            fetchPriority="high"
            className="relative aspect-[4/5] w-full object-cover object-center shadow-[0_40px_90px_rgba(0,0,0,.35)] transition-transform duration-700 ease-out group-hover:scale-[1.012]"
          />
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between border-t border-white/25 pt-4 text-ivory sm:bottom-7 sm:left-7 sm:right-7 [text-shadow:0_1px_12px_rgba(0,0,0,0.55)]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-ivory/90">{brand}</p>
              <p className="mt-1 font-serif-lux text-xl font-medium">{model}</p>
            </div>
            <ArrowDownRight className="h-5 w-5 text-gold transition-transform group-hover:translate-x-1 group-hover:translate-y-1" />
          </div>
        </Link>
      </div>

      <div data-hero-rail className="absolute inset-x-0 bottom-0 border-t border-gold/15 bg-black/25 backdrop-blur-sm">
        <div className="museum-shell grid grid-cols-2 divide-x divide-gold/15 sm:grid-cols-4">
          {[
            ["36", "Curated pieces"],
            ["10", "Great houses"],
            ["100%", "Authenticated flow"],
            ["24/7", "Private access"],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-4 sm:px-6">
              <p className="font-display text-sm text-gold">{value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-travertine/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
