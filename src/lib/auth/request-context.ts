/**
 * Request-boundary helpers: read the session from cookies in Server Components,
 * Server Actions and Route Handlers. All authorization flows through rbac.ts.
 */

import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, resolveSession, type SessionWithUser } from "./session-service";

/** For Server Components / Actions / Route Handlers. Returns null when anonymous. */
export async function getSession(): Promise<SessionWithUser | null> {
  const cookieStore = await cookies();
  return resolveSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const { sessionTtlMinutes, isProduction } = (await import("@/core/config")).env();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: sessionTtlMinutes * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
}

/** Coarse client identity for rate limiting (never logged raw). */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "127.0.0.1";
  const ua = h.get("user-agent") ?? "unknown";
  return `${ip}|${ua.slice(0, 40)}`;
}

export async function userAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}

/**
 * CSRF defense-in-depth for route handlers: with SameSite=Lax cookies, cross-site
 * POSTs cannot carry the session; we additionally require same-origin for
 * mutating requests.
 */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return; // same-origin fetch from server action / curl in dev
  const host = h.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost !== host) {
      throw new Error("Cross-origin request rejected");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Cross-origin request rejected") throw error;
    throw new Error("Invalid Origin header");
  }
}
