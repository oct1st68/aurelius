/**
 * Server-side session management. Sessions live in the sessions collection;
 * the browser holds only an opaque token in an HttpOnly cookie.
 *
 * Session fixation: a fresh token is minted on every login.
 * Revocation: logout + "sign out of all devices" both supported.
 */

import { env } from "@/core/config";
import { ForbiddenError, NotFoundError, UnauthenticatedError } from "@/core/errors";
import type { Session, User } from "@/domain/entities";
import { repos } from "@/data/repositories";
import { nowIso } from "@/core/time";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "aurelius_session";

export interface SessionWithUser {
  session: Session;
  user: User;
}

export async function createSession(userId: string, userAgent: string | null): Promise<string> {
  const raw = generateToken();
  const ttl = env().sessionTtlMinutes;
  await repos().sessions.create({
    userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttl * 60_000).toISOString(),
    revokedAt: null,
    userAgent: userAgent?.slice(0, 200) ?? null,
  });
  return raw;
}

/** Returns the session+user for a raw cookie token, or null when invalid/expired/revoked. */
export async function resolveSession(rawToken: string | undefined): Promise<SessionWithUser | null> {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const session = await repos().sessions.find((s) => s.tokenHash === tokenHash);
  if (!session) return null;
  if (session.revokedAt || session.expiresAt <= nowIso()) return null;
  const user = await repos().users.find((u) => u.id === session.userId);
  if (!user || user.status !== "ACTIVE") return null;
  return { session, user };
}

export async function requireSession(rawToken: string | undefined): Promise<SessionWithUser> {
  const result = await resolveSession(rawToken);
  if (!result) throw new UnauthenticatedError();
  return result;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await repos().sessions.mutate(sessionId, (s) => (s.revokedAt ? null : { ...s, revokedAt: nowIso() }));
}

export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  const sessions = await repos().sessions.findMany(
    (s) => s.userId === userId && !s.revokedAt && s.expiresAt > nowIso(),
  );
  for (const s of sessions) {
    await revokeSession(s.id);
  }
  return sessions.length;
}

/** Housekeeping: delete expired/revoked sessions (called opportunistically). */
export async function pruneSessions(): Promise<number> {
  const sessions = await repos().sessions.list();
  const dead = sessions.filter((s) => s.revokedAt !== null || s.expiresAt <= nowIso());
  for (const s of dead) {
    await repos().sessions.delete(s.id);
  }
  return dead.length;
}

export function assertActiveUser(user: User): void {
  if (user.status !== "ACTIVE") {
    throw new ForbiddenError("This account is suspended.");
  }
}

export function sessionNotFoundError(): NotFoundError {
  return new NotFoundError("Session not found");
}
