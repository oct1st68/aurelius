/**
 * Password hashing via Argon2id (@node-rs/argon2, prebuilt binaries).
 * Raw passwords never leave this module boundary and are never logged.
 */

import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTS = {
  memoryCost: 19_456, // 19 MiB — OWASP minimum for argon2id
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false;
  }
}

/** Password policy — enforced at registration and change. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a digit.";
  return null;
}
