/**
 * Server-side notification center with dedupe. Duplicate prevention:
 * (userId, dedupeKey) is checked inside the collection lock before insert.
 */

import { ConflictError } from "@/core/errors";
import { nowIso } from "@/core/time";
import type { Notification } from "@/domain/entities";
import type { NotificationType } from "@/domain/enums";
import { repos } from "@/data/repositories";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  /** Stable key — the same logical event never notifies twice. */
  dedupeKey: string;
}

export async function notify(input: NotifyInput): Promise<Notification | null> {
  const repo = repos().notifications;
  const existing = await repo.find(
    (n) => n.userId === input.userId && n.dedupeKey === input.dedupeKey,
  );
  if (existing) return null; // deduped
  return repo.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? null,
    readAt: null,
    dedupeKey: input.dedupeKey,
  });
}

/** Bulk variant used by order events (buyer + seller get their own copies). */
export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  for (const input of inputs) {
    await notify(input);
  }
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const rows = await repos().notifications.findMany((n) => n.userId === userId);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function unreadCount(userId: string): Promise<number> {
  return repos().notifications.count((n) => n.userId === userId && n.readAt === null);
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  const row = await repos().notifications.find((n) => n.id === notificationId);
  if (!row) throw new ConflictError("Notification not found");
  if (row.userId !== userId) throw new ConflictError("Not your notification");
  if (row.readAt) return;
  await repos().notifications.update(notificationId, { readAt: nowIso() });
}

export async function markAllRead(userId: string): Promise<number> {
  const unread = await repos().notifications.findMany(
    (n) => n.userId === userId && n.readAt === null,
  );
  for (const n of unread) {
    await repos().notifications.update(n.id, { readAt: nowIso() });
  }
  return unread.length;
}
