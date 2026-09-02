/**
 * Centralized audit logging. Sensitive values must NEVER be passed here —
 * this module strips defensively anyway (belt and suspenders).
 */

import { generateId } from "@/core/ids";
import { nowIso } from "@/core/time";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "token",
  "sessiontoken",
  "secret",
  "authorization",
  "cookie",
]);

export type AuditActorType = "user" | "system";

export interface AuditEvent {
  id: string;
  at: string;
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  /** Arbitrary non-sensitive metadata. */
  meta: Record<string, unknown>;
}

export function buildAuditEvent(input: {
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}): AuditEvent {
  return {
    id: generateId("aud"),
    at: nowIso(),
    actorType: input.actorType,
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    meta: sanitizeMeta(input.meta ?? {}),
  };
}

/** Strip sensitive keys (defensive; callers should never pass them). */
export function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = "[redacted]";
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeMeta(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
