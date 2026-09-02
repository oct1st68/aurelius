/**
 * Reviews — only for COMPLETED orders, only by the buyer, once per order.
 * Enforced inside the reviews collection lock (unique orderId + guards).
 */

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/core/errors";
import type { Review } from "@/domain/entities";
import { repos } from "@/data/repositories";
import { withLocks } from "@/data/store/lock";
import type { SessionWithUser } from "@/lib/auth/rbac";
import { audit } from "./audit-service";

export interface CreateReviewInput {
  orderId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
}

export async function createReview(
  auth: SessionWithUser,
  input: CreateReviewInput,
): Promise<Review> {
  if (input.title.trim().length < 4 || input.title.length > 80) {
    throw new ValidationError("Title must be 4–80 characters.");
  }
  if (input.body.trim().length < 20 || input.body.length > 2000) {
    throw new ValidationError("Review body must be 20–2000 characters.");
  }
  return withLocks(["collection:reviews", "collection:orders"], async () => {
    const order = await repos().orders.find((o) => o.id === input.orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.buyerId !== auth.user.id) {
      throw new ForbiddenError("Only the buyer of this order can review it.");
    }
    if (order.status !== "COMPLETED" && order.status !== "PAYOUT_RELEASED") {
      throw new ConflictError("Reviews unlock after the order is completed.");
    }
    const existing = await repos().reviews.find((r) => r.orderId === order.id);
    if (existing) throw new ConflictError("This order has already been reviewed.");

    const review = await repos().reviews.create({
      orderId: order.id,
      listingId: order.listingId,
      buyerId: auth.user.id,
      sellerId: order.sellerId,
      rating: input.rating,
      title: input.title.trim(),
      body: input.body.trim(),
      status: "PUBLISHED",
    });
    await audit({
      actorType: "user",
      actorId: auth.user.id,
      action: "review.created",
      targetType: "review",
      targetId: review.id,
      meta: { orderId: order.id },
    });
    return review;
  });
}

export async function listReviewsForListing(listingId: string): Promise<Review[]> {
  const rows = await repos().reviews.findMany(
    (r) => r.listingId === listingId && r.status === "PUBLISHED",
  );
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listReviewsForSeller(sellerId: string): Promise<Review[]> {
  const rows = await repos().reviews.findMany(
    (r) => r.sellerId === sellerId && r.status === "PUBLISHED",
  );
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function hasReviewForOrder(orderId: string): Promise<boolean> {
  return (await repos().reviews.find((r) => r.orderId === orderId)) !== undefined;
}

/** Admin moderation. */
export async function setReviewStatus(
  auth: SessionWithUser,
  reviewId: string,
  status: "PUBLISHED" | "HIDDEN",
  reason: string,
): Promise<Review> {
  if (!auth.user.roles.includes("ADMIN")) throw new ForbiddenError("Admins only");
  if (reason.trim().length < 4) throw new ValidationError("Moderation reason required.");
  const updated = await repos().reviews.update(reviewId, { status });
  await audit({
    actorType: "user",
    actorId: auth.user.id,
    action: `review.${status.toLowerCase()}`,
    targetType: "review",
    targetId: reviewId,
    meta: { reason },
  });
  return updated;
}
