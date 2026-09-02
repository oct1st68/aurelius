# DATABASE-MIGRATION.md — LocalJsonStore → PostgreSQL

The app already speaks to persistence through repository interfaces
(`src/data/repositories/base-repository.ts`), so migration is a swap of
implementations, not a rewrite. UI, server actions, services, and tests keep
their contracts.

## 1. What maps cleanly

| JSON collection | Table | Notes |
| --- | --- | --- |
| `users` | `users` | `email` UNIQUE; `password_hash` TEXT |
| `sessions` | `sessions` | `token_hash` UNIQUE; FK → users; index on `token_hash` |
| `listings` | `listings` | `slug` UNIQUE; embed images as `jsonb` or separate `listing_images` |
| `offers` / `orders` / `payments` | same | `idempotencyKey` UNIQUE on payments |
| `certificates` | `certificates` | `certificate_number` UNIQUE |
| `reviews` | `reviews` | `order_id` UNIQUE (one review per order) |
| `audit-events` | `audit_events` | append-only; index `(at)` |
| cart / vault / notifications | same | dedupe via `(user_id, listing_id)` / `(user_id, dedupe_key)` UNIQUE |

Money stays `BIGINT` cents. Timestamps stay `timestamptz` (ISO strings parse
directly).

## 2. Swap points (three seams)

1. **Repositories.** Implement `PgCollectionRepository<T>` with the same
   `list/find/findMany/getById/create/update/mutate/delete/count` surface
   (Drizzle or `pg`). `mutate(id, fn)` becomes
   `SELECT … FOR UPDATE` + write inside a transaction.
2. **Cross-collection locks.** `withLocks(["collection:orders", …])` maps to
   `BEGIN; SELECT … FOR UPDATE` on the touched rows in a fixed order — the
   call sites already sort keys, so deadlock risk is nil.
3. **IDs.** Prefixed string ids (`ord_…`) can be kept as `TEXT PRIMARY KEY`
   verbatim; no refactor needed.

## 3. Suggested order of work

1. Stand up Postgres; generate schema from `src/domain/entities.ts` shapes.
2. Write `PgRepositories` behind the existing interface; add a
   `PERSISTENCE=postgres|json` switch in `src/core/config.ts`.
3. Port integration tests to run against both drivers (tests already isolate
   data dirs via `AURELIUS_DATA_DIR`; add a driver flag).
4. Move media files to object storage (S3/R2) — the upload service is the
   only filesystem touchpoint outside `data/local`.
5. Dual-write during cutover; backfill with the seed script as a
   deterministic fixture.

## 4. What changes semantically

- `withCollection` read-modify-write becomes true transactions — stronger
  than the current single-process mutex.
- `InMemoryRateLimiter` → Redis/Postgres counters if horizontally scaled.
- Notification dedupe moves into a UNIQUE constraint.

## 5. Out of scope (not implemented here)

No ORM, migration tooling, or Postgres code ships in this repo — by
specification the current version runs entirely on local JSON.
