/**
 * Order service — centralized state machine.
 * transitionOrder() is the ONLY function allowed to change order.status;
 * it validates against ORDER_TRANSITIONS, appends a timeline event, and
 * triggers side effects (payout creation on COMPLETED, passport on COMPLETED).
 */

import { ConflictError, ForbiddenError, NotFoundError } from "@/core/errors";
import { nowIso } from "@/core/time";
import type { Order } from "@/domain/entities";
import { canTransitionOrder, type OrderStatus } from "@/domain/enums";
import { repos } from "@/data/repositories";
import { isAdmin, type SessionWithUser } from "@/lib/auth/rbac";
import { audit } from "./audit-service";
import { notifyMany, type NotifyInput } from "./notification-service";
import { passportService } from "./passport-service";
import { payoutService } from "./payout-service";

export interface TransitionInput {
  orderId: string;
  to: OrderStatus;
  actor: SessionWithUser | null;
  actorType?: "user" | "system";
  note: string;
  trackingNumber?: string;
}

const NOTIFY_BY_STATUS: Partial<Record<OrderStatus, (order: Order) => NotifyInput[]>> = {
  PAYMENT_SECURED: (o) => [
    {
      userId: o.sellerId,
      type: "PAYMENT_SECURED",
      title: "Payment secured",
      body: `Order ${o.id} is funded — please prepare the watch for dispatch.`,
      link: `/seller/orders/${o.id}`,
      dedupeKey: `order:${o.id}:PAYMENT_SECURED:seller`,
    },
    {
      userId: o.buyerId,
      type: "ORDER_UPDATED",
      title: "Payment secured",
      body: `Your payment for ${o.id} is secured in escrow-like custody.`,
      link: `/orders/${o.id}`,
      dedupeKey: `order:${o.id}:PAYMENT_SECURED:buyer`,
    },
  ],
  SHIPPED_TO_BUYER: (o) => [
    {
      userId: o.buyerId,
      type: "SHIPPED",
      title: "Your watch is on its way",
      body: `Order ${o.id} has shipped${o.trackingNumber ? ` — tracking ${o.trackingNumber}` : ""}.`,
      link: `/orders/${o.id}`,
      dedupeKey: `order:${o.id}:SHIPPED_TO_BUYER:buyer`,
    },
  ],
  DELIVERED: (o) => [
    {
      userId: o.buyerId,
      type: "DELIVERED",
      title: "Delivered",
      body: `Order ${o.id} was delivered. Complete your review once satisfied.`,
      link: `/orders/${o.id}`,
      dedupeKey: `order:${o.id}:DELIVERED:buyer`,
    },
  ],
};

export async function transitionOrder(input: TransitionInput): Promise<Order> {
  const { to } = input;
  return repos().orders.mutate(input.orderId, (order) => {
    if (!canTransitionOrder(order.status, to)) {
      throw new ConflictError(`Illegal order transition ${order.status} → ${to}`);
    }
    // Authorization rules per target state:
    //  - system transitions (payment confirm) — actorType system
    //  - SELLER_PREPARING / SHIPPED_TO_AUTHENTICATOR / SHIPPED_TO_BUYER → seller (owner) or admin
    //  - AUTHENTICATING / AUTHENTICATED / AUTHENTICATION_FAILED → authenticator or admin
    //  - DELIVERED → system (courier simulation) or admin
    //  - COMPLETED → buyer confirms or admin
    //  - CANCELLED / REFUND_* → admin or payment system
    if (input.actorType !== "system" && input.actor) {
      const user = input.actor.user;
      const isOwner = order.sellerId === user.id || order.buyerId === user.id;
      const admin = isAdmin(user);
      const sellerOnly: OrderStatus[] = [
        "SELLER_PREPARING",
        "SHIPPED_TO_AUTHENTICATOR",
        "SHIPPED_TO_BUYER",
      ];
      const authenticatorOnly: OrderStatus[] = ["AUTHENTICATING", "AUTHENTICATED", "AUTHENTICATION_FAILED"];
      const buyerConfirm: OrderStatus[] = ["COMPLETED"];
      const authenticatorAllowed =
        user.roles.includes("AUTHENTICATOR") && authenticatorOnly.includes(to);
      if (!admin && !isOwner && !authenticatorAllowed) {
        throw new ForbiddenError("You are not a party to this order.");
      }
      if (sellerOnly.includes(to) && order.sellerId !== user.id && !admin) {
        throw new ForbiddenError("Only the seller can perform this step.");
      }
      if (authenticatorOnly.includes(to) && !user.roles.includes("AUTHENTICATOR") && !admin) {
        throw new ForbiddenError("Only the authenticator can perform this step.");
      }
      if (buyerConfirm.includes(to) && order.buyerId !== user.id && !admin) {
        throw new ForbiddenError("Only the buyer can confirm completion.");
      }
      if ((to === "CANCELLED" || to === "REFUND_PENDING" || to === "REFUNDED" || to === "DISPUTED") && !admin && order.buyerId !== user.id) {
        throw new ForbiddenError("Only admins or the buyer can cancel/dispute.");
      }
    }

    const event = {
      id: `evt_${Math.random().toString(36).slice(2, 10)}`,
      at: nowIso(),
      from: order.status,
      to,
      note: input.note,
      actorId: input.actor?.user.id ?? null,
    };
    return {
      ...order,
      status: to,
      trackingNumber: input.trackingNumber ?? order.trackingNumber,
      timeline: [...order.timeline, event],
      updatedAt: nowIso(),
    };
  }).then(async (order) => {
    // Side effects (outside the row lock, after the status has landed).
    if (to === "COMPLETED") {
      await onCompleted(order);
    }
    const notifier = NOTIFY_BY_STATUS[to];
    if (typeof notifier === "function") {
      await notifyMany(notifier(order));
    }
    await audit({
      actorType: input.actorType ?? "user",
      actorId: input.actor?.user.id ?? null,
      action: `order.${to.toLowerCase()}`,
      targetType: "order",
      targetId: order.id,
      meta: { note: input.note },
    });
    return order;
  });
}

async function onCompleted(order: Order): Promise<void> {
  // Guard: passport/payout created once.
  if (!order.passportId) {
    const passport = await passportService.createForOrder(order);
    await repos().orders.update(order.id, { passportId: passport.id });
    order = { ...order, passportId: passport.id };
  }
  if (!order.certificateId) {
    // Certificates are issued during AUTHENTICATED; if missing (demo flow), leave null.
  }
  await payoutService.createForOrder(order);
}

export async function getOrder(orderId: string): Promise<Order> {
  const order = await repos().orders.find((o) => o.id === orderId);
  if (!order) throw new NotFoundError("Order not found");
  return order;
}

/** Buyer/seller/admin visibility (IDOR shield). */
export async function getOrderForUser(orderId: string, auth: SessionWithUser): Promise<Order> {
  const order = await getOrder(orderId);
  const isParty = order.buyerId === auth.user.id || order.sellerId === auth.user.id;
  if (!isParty && !isAdmin(auth.user) && !auth.user.roles.includes("AUTHENTICATOR")) {
    throw new ForbiddenError("You cannot view this order.");
  }
  return order;
}

export async function listOrdersForBuyer(buyerId: string): Promise<Order[]> {
  const rows = await repos().orders.findMany((o) => o.buyerId === buyerId);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOrdersForSeller(sellerId: string): Promise<Order[]> {
  const rows = await repos().orders.findMany((o) => o.sellerId === sellerId);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOrdersForAuthenticator(): Promise<Order[]> {
  const rows = await repos().orders.list();
  const relevant = rows.filter((o) =>
    ["PAYMENT_SECURED", "SELLER_PREPARING", "SHIPPED_TO_AUTHENTICATOR", "AUTHENTICATING"].includes(o.status),
  );
  return relevant.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export async function listAllOrders(): Promise<Order[]> {
  const rows = await repos().orders.list();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
