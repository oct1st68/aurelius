/**
 * Authentication service: register, login, logout, forgot/reset/change password.
 * Rate limiting is applied at the route/action boundary via enforceRateLimit;
 * this service enforces the credential-level rules itself.
 */

import { ConflictError, ForbiddenError, UnauthenticatedError, ValidationError } from "@/core/errors";
import { generateId } from "@/core/ids";
import { nowIso, addMinutes } from "@/core/time";
import { env } from "@/core/config";
import type { User } from "@/domain/entities";
import { repos } from "@/data/repositories";
import { hashPassword, validatePasswordStrength, verifyPassword } from "./password";
import {
  assertActiveUser,
  createSession,
  revokeAllSessionsForUser,
} from "./session-service";
import { generateToken, hashToken } from "./tokens";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

const ACCENTS = ["#B89B5E", "#4A1018", "#80684A", "#5B6B4A", "#3E4A6B", "#6B3E5B"];

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  roles?: User["roles"];
  userAgent?: string | null;
}

export interface AuthSuccess {
  user: User;
  sessionToken: string;
}

export async function register(input: RegisterInput): Promise<AuthSuccess> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new ValidationError("Enter a valid email address.");
  if (input.displayName.trim().length < 2 || input.displayName.length > 60) {
    throw new ValidationError("Display name must be 2–60 characters.");
  }
  const weakness = validatePasswordStrength(input.password);
  if (weakness) throw new ValidationError(weakness);

  const existing = await repos().users.find((u) => u.email === email);
  if (existing) {
    // Do not reveal account existence beyond this generic conflict.
    throw new ConflictError("An account with this email already exists.");
  }

  const roles: User["roles"] = input.roles ?? ["USER", "BUYER"];
  const passwordHash = await hashPassword(input.password);
  const accent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)] ?? "#B89B5E";
  const user = await repos().users.create({
    email,
    passwordHash,
    displayName: input.displayName.trim(),
    roles,
    status: "ACTIVE",
    accent,
  });
  const sessionToken = await createSession(user.id, input.userAgent ?? null);
  return { user, sessionToken };
}

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string | null;
}

export async function login(input: LoginInput): Promise<AuthSuccess> {
  const email = normalizeEmail(input.email);
  const user = await repos().users.find((u) => u.email === email);
  // Uniform failure for unknown email / wrong password (no account enumeration).
  if (!user) throw new UnauthenticatedError("Invalid email or password.");
  assertActiveUser(user);
  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw new UnauthenticatedError("Invalid email or password.");
  const sessionToken = await createSession(user.id, input.userAgent ?? null);
  return { user, sessionToken };
}

export async function requestPasswordReset(emailRaw: string): Promise<string> {
  // Always behaves identically whether or not the account exists.
  const email = normalizeEmail(emailRaw);
  const user = await repos().users.find((u) => u.email === email);
  if (!user) return "";
  const raw = generateToken();
  await repos().resetTokens.create({
    userId: user.id,
    tokenHash: hashToken(raw),
    expiresAt: addMinutes(nowIso(), env().resetTokenTtlMinutes),
    usedAt: null,
  });
  return raw; // handed to MockEmailProvider by the caller; never shown in UI
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  if (!rawToken) throw new ValidationError("Reset token is required.");
  const weakness = validatePasswordStrength(newPassword);
  if (weakness) throw new ValidationError(weakness);
  const tokenHash = hashToken(rawToken);
  const record = await repos().resetTokens.find((r) => r.tokenHash === tokenHash);
  if (!record || record.usedAt || record.expiresAt <= nowIso()) {
    throw new ValidationError("This reset link is invalid or has expired.");
  }
  const passwordHash = await hashPassword(newPassword);
  await repos().users.update(record.userId, { passwordHash });
  await repos().resetTokens.update(record.id, { usedAt: nowIso() });
  // Any stolen session is now worthless.
  await revokeAllSessionsForUser(record.userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await repos().users.find((u) => u.id === userId);
  if (!user) throw new UnauthenticatedError();
  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw new ValidationError("Current password is incorrect.");
  const weakness = validatePasswordStrength(newPassword);
  if (weakness) throw new ValidationError(weakness);
  const passwordHash = await hashPassword(newPassword);
  await repos().users.update(userId, { passwordHash });
}

/** Internal use (seed/tests): deterministic role assignment with validation. */
export function rolesForSeed(seedKey: string): User["roles"] {
  switch (seedKey) {
    case "admin":
      return ["USER", "ADMIN"];
    case "authenticator":
      return ["USER", "AUTHENTICATOR"];
    case "seller":
      return ["USER", "BUYER", "SELLER"];
    default:
      return ["USER", "BUYER"];
  }
}

export function newUserId(): string {
  return generateId("usr");
}

export function assertCanSell(user: User): void {
  if (!user.roles.includes("SELLER")) {
    throw new ForbiddenError("Seller role required.");
  }
}
