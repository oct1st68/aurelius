/**
 * Prefixed ID generation. Format: `<prefix>_<12 base32 chars>` — sortable enough for
 * logs, unique across processes, no crypto dependency beyond node:crypto.
 *
 * Examples: usr_3kq81j2f9x0a, wat_p0k2n4b6d8f1
 */
import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"; // base32, lowercase, no i/l/o/u
const ID_RANDOM_LENGTH = 12;

export type IdPrefix =
  | "usr"
  | "ses"
  | "rt" // password reset tokens
  | "wat"
  | "img"
  | "brd" // brands
  | "off"
  | "ord"
  | "pay"
  | "cert"
  | "notif"
  | "passport"
  | "rev" // reviews
  | "art" // minerva articles
  | "car" // cart items
  | "vault" // vault entries
  | "evt" // order timeline events
  | "aud" // audit log
  | "email" // mock email outbox
  | "prf" // payouts / misc platform rows
  | "vtg"; // vault token

export function generateId(prefix: IdPrefix): string {
  const bytes = randomBytes(ID_RANDOM_LENGTH);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return `${prefix}_${out}`;
}

/** Deterministic ID for seed data (same input → same output). */
export function seededId(prefix: IdPrefix, key: string): string {
  return `${prefix}_${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

const ID_PATTERN = /^[a-z]{1,8}_[0-9a-z-]{1,64}$/;

/** Runtime guard used at trust boundaries before an ID is looked up. */
export function isValidId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}
