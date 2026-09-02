# AURELIUS — The Empire of Time

A multi-vendor marketplace for fine and vintage timepieces. **Time is the only
empire that never falls.**

- **Institution landing** (`/`) — dark-gothic editorial: the register, provenance, houses
- **Catalog & commerce** — browse, offers, cart, escrow-style checkout, orders
- **Mercury Market** — seller dashboard, listing wizard, moderation
- **Atelier** — authenticator inspections & certificates
- **Senate** — admin console with audit log

> Demonstration environment: inventory, prices and provenance records are
> simulated; payments run through a mock provider. No real funds move.

## Quickstart

```bash
pnpm install
pnpm data     # reset the register to the deterministic demo dataset
pnpm dev      # http://localhost:3000
```

## Demo accounts

Password for all: `Aurelius#Demo2024` (override with `AURELIUS_SEED_PASSWORD`)

| Email | Roles |
| --- | --- |
| `admin@aurelius.local` | USER, ADMIN |
| `authenticator@aurelius.local` | USER, AUTHENTICATOR |
| `seller@aurelius.local` | USER, BUYER, SELLER |
| `buyer@aurelius.local` | USER, BUYER |

Test cards (mock provider): `4242 4242 4242 4242` succeeds · `4000 0000 0000 0002` declines · `4000 0000 0000 3220` requires action.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm data` | **Force-reset** the register (dev) |
| `pnpm data:if-empty` | Seed only when empty (deploy start command) |
| `pnpm test` | Vitest unit + integration + security |
| `pnpm test:e2e` | Playwright journeys |
| `pnpm lint` | ESLint |

## Architecture

Modular monolith: **UI → Server Actions / Route Handlers → domain services →
repositories → LocalJsonStore → `data/local/*.json`.** Persistence sits behind
a repository interface so the JSON store can be replaced by PostgreSQL without
touching UI or business logic (see `docs/DATABASE-MIGRATION.md`).

- Design direction: `docs/DESIGN-DIRECTION.md`, `docs/TASTE-REDESIGN.md`
- Going live: `docs/PRODUCTION.md`
- Security posture: `docs/SECURITY.md`

Photography in `storage/local/photos` is licensed Unsplash content used as
simulated demo imagery (see `storage/local/photos/CREDITS.md`).
