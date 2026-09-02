/**
 * Opaque session & reset tokens: 32 random bytes, base64url. Only the SHA-256
 * hash is persisted; the raw value lives in the HttpOnly cookie (sessions) or
 * the one-time reset link. Tokens are compared hash-to-hash — timing-safe by
 * construction since we look up by hash.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokensEqual(a: string, b: string): boolean {
  const ha = hashToken(a);
  const hb = hashToken(b);
  return timingSafeEqual(Buffer.from(ha), Buffer.from(hb));
}

/** Human-readable certificate numbers: AUR-2025-000123 (monotonic via counter file). */
export function formatCertificateNumber(seq: number, year = new Date().getFullYear()): string {
  return `AUR-${year}-${String(seq).padStart(6, "0")}`;
}

/** Mask a serial: show last 4, mask the rest. "AB12••••••••3456" style. */
export function maskSerial(serial: string): string {
  const clean = serial.replace(/\s+/g, "").toUpperCase();
  if (clean.length <= 4) return "•".repeat(clean.length);
  return `${"•".repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}
