# AURELIUS — Imperial Museum Editorial Design Direction

## 1. Design principles

- **Imperial, not theatrical:** Roman influence comes from axial composition, inscriptions, stone and metal materiality—not literal columns, laurels, eagles, coins, or fantasy ornament.
- **Museum hierarchy:** one focal object, one key light, one dominant message per viewport.
- **Quiet luxury:** antique gold stays below roughly 8% of visible color. Product photography, typography, and negative space create value.
- **Editorial commerce:** product stories use auction-catalog pacing while transactional screens use private-banking clarity.
- **Precision before decoration:** price, provenance, condition, certification, custody, and actions remain immediately legible.

## 2. Visual system

### Color

```css
--ink-950: #090909;
--ink-900: #11100f;
--limestone-50: #f3efe6;
--travertine-100: #e4dccd;
--stone-400: #9a9183;
--bronze-600: #786044;
--gold-500: #b59a62;
--burgundy-800: #46131a;
--forest-800: #26372d;
```

Warm limestone is the primary storefront/editorial canvas. Obsidian is reserved for ceremonial entry points, checkout, certificates, and institutional screens.

### Typography

- Cinzel Variable: wordmark, display titles, price moments.
- EB Garamond Variable: editorial headings and product names.
- Inter Variable: body, metadata, controls, tables.
- Scale: display 64–132px; H1 38–64px; H2 30–48px; H3 24–32px; body 15–19px; metadata 11px.
- Uppercase tracking is limited to short metadata labels at `0.12–0.16em`.

### Spacing and surfaces

- 4px base unit; primary gaps 8/12/16/24/32px.
- Section spacing: 48px mobile, 72px tablet, 112px desktop.
- Corners: 0–2px. No SaaS-like rounded cards or glassmorphism.
- Limestone carries 1–1.5% monochrome grain. Dark surfaces are matte.
- Neutral stone dividers replace repeated gold outlines. Gold signals active/focus only.
- Product lighting uses one soft directional key and a warm-black diffused shadow.

### Logo

“The Arch A”: a custom A monogram whose negative space forms a Roman arch; a single horizontal stroke suggests a watch hand. No crowns, eagles, laurels, helmets, or seals. Responsive inline SVG supports mark-only and horizontal lockups.

### Imagery

- Hero: monumental fictional watch on a black limestone plinth.
- Catalog: warm-neutral seamless packshot, full product, no baked-in text.
- Detail: controlled macro dial, crown, and movement images.
- Generated assets are explicitly fictional demo imagery. Product-faithful ecommerce generation requires real watch references.

## 3. Screen transformations

| Screen | Before | After | Rationale |
|---|---|---|---|
| Home | Centered dark hero and concentric decoration | Image-led asymmetric hero, low-left title, provenance rail | Product becomes evidence of luxury |
| Systems | Five equal bordered boxes | Museum index with staggered widths and restrained numerals | Breaks template rhythm |
| Featured catalog | Uniform three-card grid | One lead lot with two supporting pieces | Builds hierarchy |
| Great Houses | Text-only grid | Alternating archive portraits and house metadata | Makes heritage tangible |
| Catalog | Dark bordered cards, always-visible actions | Limestone canvas, image-first lots, contextual actions | Reduces visual noise |
| Watch detail | Equal 50/50 split | 7/5 gallery and sticky provenance column | Improves hierarchy and scanning |
| Cart/checkout | Panel stack | Private-banking ledger with clear totals | Builds monetary trust |
| Vault | Standard saved list | Private collection room with larger imagery | Makes Vesta feel private |
| Seller/admin | Equal decorative KPI cards | Table-first banking/operations layout | Supports repeated work |
| Certificate/passport | Dark bordered document | Print-grade archival document on warm paper | Feels authoritative |
| Mobile | Compressed desktop | Edge-to-edge media, sticky purchase bar, bottom sheets | Purpose-built mobile UX |

## 4. Depth & motion

### 3D layer (CSS transforms only — no WebGL dependency)

- **The Rotunda:** slow 3D carousel (rotateY + translateZ) of the ten houses on the homepage; slows on hover; static under reduced-motion.
- **Museum-case tilt:** lot cards and the detail gallery tilt ±3–5° toward the pointer with a specular sheen (GSAP `quickTo`); pointer-fine devices only.
- **Hero parallax:** image drifts down/scales on scroll (ScrollTrigger scrub); copy counter-drifts and fades.

### Motion principles

- GSAP is limited to hero composition, editorial reveals, gallery transitions, and numeric state changes.
- CSS handles hover, focus, buttons, badges, and form feedback.
- Timings: controls 150–220ms; card imagery 280–360ms; sheets 320–420ms; sections 600–800ms; hero 900–1200ms.
- Animate only opacity and transforms (`y: 12–28`, `scale: 0.985–1`).
- Use `power2.out` and `power3.inOut`; stagger 40–80ms.
- No loops, glows, rotating rings, bouncing, cursor trails, or excessive parallax.
- `gsap.matchMedia()` honors `prefers-reduced-motion`; touch devices skip tilt; mobile removes parallax.
- All 3D is compositor-only (transform-style: preserve-3d); no layout animation.

## 5. Imagery

Catalog/brand/article imagery uses licensed Unsplash photography (see `storage/local/photos/CREDITS.md`) as simulated demo content. No maison marketing assets are copied or hot-linked. Brand names remain fictional.
