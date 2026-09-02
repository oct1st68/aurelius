/**
 * Centralized authorization — the ONLY way route handlers and server actions
 * make access decisions. The frontend is never trusted.
 *
 *  requireUser()           → SessionWithUser (throws UNAUTHENTICATED)
 *  requireRole(...roles)   → SessionWithUser or FORBIDDEN
 *  requirePermission(p)    → SessionWithUser or FORBIDDEN
 *  requireOwnership(...)   → verifies a resource belongs to the caller (IDOR shield)
 *  authorize()             → composable check used inside services
 */

import { ForbiddenError, UnauthenticatedError } from "@/core/errors";
import type { Permission, Role } from "@/domain/enums";
import { ROLE_PERMISSIONS } from "@/domain/enums";
import type { SessionWithUser } from "./session-service";

export type { SessionWithUser };

export interface AuthContext {
  user: SessionWithUser["user"];
  sessionId: string;
}

export function rolesOf(user: SessionWithUser["user"]): Role[] {
  return user.roles;
}

export function hasRole(user: SessionWithUser["user"], ...roles: Role[]): boolean {
  return roles.some((r) => user.roles.includes(r));
}

/**
 * Effective permissions = union of permissions from the user's roles.
 * Roles derive from the server-side ROLE_PERMISSIONS map — a client cannot
 * claim a permission it does not hold.
 */
export function permissionsOf(user: SessionWithUser["user"]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of user.roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      set.add(permission);
    }
  }
  return set;
}

export function hasPermission(
  userOrSession: SessionWithUser | SessionWithUser["user"],
  permission: Permission,
): boolean {
  const user = "roles" in userOrSession ? userOrSession : userOrSession.user;
  return permissionsOf(user).has(permission);
}

/** Admin is treated as a superuser for ownership-style checks. */
export function isAdmin(user: SessionWithUser["user"]): boolean {
  return hasRole(user, "ADMIN");
}

export function requireUser(auth: SessionWithUser | null): SessionWithUser {
  if (!auth) throw new UnauthenticatedError();
  return auth;
}

export function requireRole(auth: SessionWithUser | null, ...roles: Role[]): SessionWithUser {
  const session = requireUser(auth);
  if (!hasRole(session.user, ...roles)) {
    throw new ForbiddenError(`Requires role: ${roles.join(" or ")}`);
  }
  return session;
}

export function requirePermission(
  auth: SessionWithUser | null,
  permission: Permission,
): SessionWithUser {
  const session = requireUser(auth);
  if (!hasPermission(session.user, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return session;
}

/** Admin may act on anything; otherwise the resource must belong to the caller. */
export function requireOwnership(
  auth: SessionWithUser | null,
  resourceOwnerId: string,
  what: string,
): SessionWithUser {
  const session = requireUser(auth);
  if (isAdmin(session.user)) return session;
  if (session.user.id !== resourceOwnerId) {
    throw new ForbiddenError(`You do not own this ${what}`);
  }
  return session;
}

/** Non-throwing variant for UI rendering decisions (server components). */
export function can(
  auth: SessionWithUser | null,
  permission: Permission,
): boolean {
  if (!auth) return false;
  return hasPermission(auth.user, permission);
}
