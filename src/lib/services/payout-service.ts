/**
 * Payout service — mock escrow release. A PENDING payout is created when an
 * order reaches COMPLETED; the mock "release" marks it RELEASED and is audit-
 * logged. NOT a real escrow service — see README disclaimer.
 */

import { ConflictError, ForbiddenError, NotFoundError } from "@/core/errors";
import { nowIso } from "@/core/time";
import type { Order, Payout } from "@/domain/entities";
import { repos } from "@/data/repositories";
import { isAdmin, type SessionWithUser } from "@/lib/auth/rbac";
import { audit } from "./audit-service";
import { notify } from "./notification-service";
import { transitionOrder } from "./order-service";

export const payoutService = {
  async createForOrder(order: Order): Promise<Payout> {
    const existing = await repos().payouts.find((p) => p.orderId === order.id);
    if (existing) return existing;
    const platformFeeBps = 500; // 5% platform fee, mirrors env config
    const fee = Math.round((order.total.amountCents * platformFeeBps) / 10_000);
    const payout = await repos().payouts.create({
      sellerId: order.sellerId,
      orderId: order.id,
      amount: {
        amountCents: order.total.amountCents - fee,
        currency: order.total.currency,
      },
      status: "PENDING",
      releasedAt: null,
    });
    return payout;
  },

  async releaseForOrder(order: Order, actor: SessionWithUser | null): Promise<Payout> {
    const payout = await repos().payouts.find((p) => p.orderId === order.id);
    if (!payout) throw new NotFoundError("Payout not found");
    const released = await repos().payouts.mutate(payout.id, (p) => {
      if (p.status === "RELEASED") return null; // idempotent
      return { ...p, status: "RELEASED", releasedAt: nowIso() };
    });
    if (!released) return payout;
    // The order advances COMPLETED → PAYOUT_RELEASED (system transition).
    if (order.status === "COMPLETED") {
      await transitionOrder({
        orderId: order.id,
        to: "PAYOUT_RELEASED",
        actor: null,
        actorType: "system",
        note: "Mock escrow payout released to seller",
      });
    }
    await notify({
      userId: payout.sellerId,
      type: "ORDER_UPDATED",
      title: "Payout released",
      body: `Payout for order ${order.id} was released (mock escrow).`,
      link: `/seller/payouts`,
      dedupeKey: `payout:${payout.id}:released`,
    });
    await audit({
      actorType: actor ? "user" : "system",
      actorId: actor?.user.id ?? null,
      action: "payout.released",
      targetType: "payout",
      targetId: payout.id,
    });
    return released;
  },

  async listForSeller(sellerId: string): Promise<Payout[]> {
    const rows = await repos().payouts.findMany((p) => p.sellerId === sellerId);
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async assertSellerView(auth: SessionWithUser, payout: Payout): Promise<void> {
    if (payout.sellerId !== auth.user.id && !isAdmin(auth.user)) {
      throw new ForbiddenError("Not your payout.");
    }
  },
};

export function assertPayoutPending(payout: Payout): void {
  if (payout.status !== "PENDING") {
    throw new ConflictError("Payout already released");
  }
}
