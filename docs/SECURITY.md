# SECURITY.md — AURELIUS

## Model

Defense-in-depth per OWASP ASVS-lite, tuned for a single-process localhost
demo that can be hardened further for production.

## Authentication

- **Hashing:** Argon2id (`@node-rs/argon2`, 19 MiB / t=2 / p=1). Plaintext
  never stored or logged.
- **Sessions:** opaque 32-byte tokens, HttpOnly + SameSite=Lax cookie
  (`Secure` in production). Only SHA-256 hashes are persisted. Logout and
  password change revoke server-side.
- **Reset:** single-use tokens, 30-minute expiry, hash-stored; all sessions
  revoked on use. Tokens never returned to the UI — dev inbox or server log only.
- **Enumeration:** uniform failure for unknown email vs wrong password;
  registration conflicts are generic.

## Authorization

- **RBAC:** USER/BUYER/SELLER/AUTHENTICATOR/ADMIN; permissions derive only
  from the server-side `ROLE_PERMISSIONS` map — clients cannot claim roles.
- **Centralized gates:** `requireUser / requireRole / requirePermission /
  requireOwnership` in `src/lib/auth/rbac.ts`. Admin bypasses ownership only.
- **IDOR shields:** order reads verify buyer/seller/authenticator/admin;
  listings verify owner; passports resolve sensitive fields only for owner +
  authorized roles; masked serials on public certificate pages.

## Commerce integrity

- **State machines:** order transitions validated against `ORDER_TRANSITIONS`
  with role-scoped steps (seller ships, authenticator certifies, buyer
  confirms); illegal jumps throw.
- **Transactions:** multi-key mutex (`withLocks`) serializes
  offer-acceptance, checkout, and refunds (offers+listings+orders,
  orders+payments+listings). Re-entrant via AsyncLocalStorage.
- **Idempotency:** payments keyed by `idempotencyKey` (unique); retries
  return the original result instead of double-charging.
- **Payments:** provider-confirmed only — the client can never set order or
  payment status. Mock provider outcome is driven by test card numbers.

## Input & output

- **Validation:** Zod-style guards at boundaries; `parseMoneyInput` rejects
  malformed money; money is integer cents throughout.
- **Uploads:** MIME allowlist + extension cross-check, magic-byte dimension
  sniffing, size caps, server-generated storage names (no client paths), and
  containment re-checks against the storage root.
- **Media serving:** route handler refuses path traversal; placeholders
  replace missing assets; nosniff + sandbox CSP on media responses.
- **Encoding:** React escapes by default; lint forbids `alert/confirm/prompt`
  and `any`.

## Platform

- **CSRF:** SameSite=Lax + same-origin assertion for mutating route handlers.
- **Rate limits:** sliding-window limiter on login, register, reset, offers,
  reviews, checkout, search, uploads (in-memory; single process).
- **Audit:** append-only `audit-events` with defensive redaction of
  password/token/secret keys; admin overrides, refunds, certification,
  moderation, and auth events are recorded.
- **Logging:** errors surface user-safe messages (`toUserMessage`); no
  credentials, tokens, or hashes in logs.

## Known limits (by design, see docs/PRODUCTION.md)

1. JSON persistence = single Node process; the mutex does not span instances.
2. In-memory rate limits and notification dedup reset on restart.
3. Mock payment provider — no PSP integration; refunds are simulated rows.
4. Demo seed ships known passwords; rotate via `AURELIUS_SEED_PASSWORD`
   before any public deployment.
