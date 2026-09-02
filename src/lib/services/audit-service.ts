/**
 * Audit service — append-only trail for security-relevant actions
 * (auth events, moderation, refunds, certification, admin overrides).
 */

import { buildAuditEvent, type AuditActorType } from "@/core/audit";
import type { AuditEventRow } from "@/domain/entities";
import { repos } from "@/data/repositories";

export async function audit(input: {
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}): Promise<AuditEventRow> {
  const event = buildAuditEvent(input);
  return repos().auditEvents.create({
    at: event.at,
    actorType: event.actorType,
    actorId: event.actorId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    meta: event.meta,
  });
}

export async function listAudit(limit = 200): Promise<AuditEventRow[]> {
  const rows = await repos().auditEvents.list();
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
