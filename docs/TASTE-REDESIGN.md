# AURELIUS — Taste-Driven Refinement

Concept preserved: **Imperial Museum Editorial** — quiet luxury, editorial typography, restrained materiality. This pass refines craft and micro-interaction only; layout structure, information architecture, and user flows are untouched.

## Side-by-side comparison

| Screen | Before | After (this pass) | Taste principle |
|---|---|---|---|
| Header nav | Plain hover color shift | Gold underline grows from the left on hover/focus (`::after`, 240ms cubic-bezier) | Editorial link grammar — motion echoes print underlines |
| Buttons (all) | `translateY` on hover only | Added tactile press: `translateY(0) scale(0.985)` on `:active` | Physical, precise feedback; luxury = deliberate response |
| Inputs | Border-color on focus | Added `:focus-visible` gold outline (2px, offset 2px) — keeps border, adds keyboard ring | WCAG AA focus visibility, complementary not redundant |
| Headings | Widows possible (single dangling word) | `text-wrap: balance` on `h1/h2/h3` + `.editorial-title` + `.display-title` | Typographic discipline — balanced lines read as set type |
| Footer links | Plain color change | Underline grow with footer-scoped offset (`left:0; width:100%`) | Consistent interaction grammar across chrome |
| Product shadow | `0 36px 72px / 18%` | `0 28px 60px / 16%` (softer, tighter diffusion) | Refined materiality — shadow reads as lighting, not drop |
| Reduced motion | Global kill switch existed | Underline grow explicitly disabled under `prefers-reduced-motion` | Motion is an enhancement, never a requirement |

Screenshot pairs (captured in `test-results/`):
- Desktop hero — before: `final-desktop.png` · after: `taste-home.png`
- Catalog — before: `f-catalog.png` · after: `taste-catalog.png`
- Mobile — before: `final-mobile.png` · after: `taste-mobile.png`

## Design rationale

**Typography discipline.** The headline hierarchy already relied on EB Garamond for editorial voice and Inter for function; the one typographic flaw was ragged lines that left a single word stranded on its own line — the classic tell of an un-set editorial page. `text-wrap: balance` (progressive enhancement; falls back to normal wrapping in older engines) restores the set-type feel without touching the scale, so the concept's serif-led editorial identity is preserved while the page reads calmer.

**Micro-interaction grammar.** Luxury interfaces signal intent through the precision of their responses, not through decoration. The header previously changed link color and nothing else; now a gold hairline grows from the left — the same directional language as the hover rule used elsewhere. Buttons gained a press state (`scale 0.985`) so the entire control feels machined, and every transition runs at 180–240ms with the same easing family. Because these are pure CSS on elements that already existed, the layout, spacing, and user flows are byte-for-byte unchanged — the concept's "restraint over ornament" rule is respected, and reduced-motion users see no behavior difference.

## Files modified
- `src/app/globals.css` — `text-wrap: balance`; button `:active` press; `.nav-link`/`.taste-link` underline grow; input `:focus-visible` ring; footer link scope; softened product shadow token; reduced-motion coverage
- `src/components/layout/header-nav.tsx` — `nav-link` class on desktop links (Sell, Atelier, Admin included)
- `src/components/layout/site-footer.tsx` — `taste-link` class on column links

## Verification
- `pnpm build`: 0 errors, 0 warnings
- `vitest run`: 62/62 passed
- `tsc --noEmit`: clean
- Horizontal overflow: 0px at 390 / 768 / 1440
