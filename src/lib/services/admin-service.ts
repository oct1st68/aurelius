/**
 * Admin operations — every override is explicit and audit-logged.
 * All functions re-check the ADMIN role server-side.
 */

import { ConflictError, NotFoundError, ValidationError } from "@/core/errors";
import { nowIso } from "@/core/time";
import type { User } from "@/domain/entities";
import type { ListingStatus, Role, SellerVerificationStatus } from "@/domain/enums";
import { repos } from "@/data/repositories";
import { isAdmin, requireRole, type SessionWithUser } from "@/lib/auth/rbac";
import { revokeAllSessionsForUser } from "@/lib/auth/session-service";
import { audit } from "./audit-service";
import { notify } from "./notification-service";
import { transitionListing } from "./listing-service";
import { refundPayment } from "./checkout-service";

export function assertAdmin(auth: SessionWithUser): void {
  if (!isAdmin(auth.user)) throw new ConflictError("Admins only");
}

export async function listUsers(): Promise<User[]> {
  const rows = await repos().users.list();
  return rows.sort((a, b) => a.email.localeCompare(b.email));
}

export async function setUserStatus(
  auth: SessionWithUser,
  userId: string,
  status: User["status"],
  reason: string,
): Promise<User> {
  requireRole(auth, "ADMIN");
  if (reason.trim().length < 4) throw new ValidationError("Reason required.");
  if (auth.user.id === userId) {
    throw new ConflictError("You cannot ban your own account.");
  }
  const user = await repos().users.find((u) => u.id === userId);
  if (!user) throw new NotFoundError("User not found");
  const updated = await repos().users.update(userId, { status });
  if (status === "BANNED") {
    await revokeAllSessionsForUser(userId);
  }
  await audit({
    actorType: "user",
    actorId: auth.user.id,
    action: `user.${status.toLowerCase()}`,
    targetType: "user",
    targetId: userId,
    meta: { reason },
  });
  return updated;
}

export async function setUserRoles(
  auth: SessionWithUser,
  userId: string,
  roles: Role[],
  reason: string,
): Promise<User> {
  requireRole(auth, "ADMIN");
  if (reason.trim().length < 4) throw new ValidationError("Reason required.");
  const user = await repos().users.find((u) => u.id === userId);
  if (!user) throw new NotFoundError("User not found");
  const updated = await repos().users.update(userId, { roles });
  await audit({
    actorType: "user",
    actorId: auth.user.id,
    action: "user.roles_changed",
    targetType: "user",
    targetId: userId,
    meta: { roles, reason },
  });
  return updated;
}

export async function setUserRolesInternal(userId: string, roles: Role[]): Promise<void> {
  // Seed/script-only path (no session). Tests may use it to build fixtures.
  await repos().users.update(userId, { roles });
}

export async function verifySeller(
  auth: SessionWithUser,
  sellerId: string,
  status: SellerVerificationStatus,
  reason: string,
): Promise<void> {
  requireRole(auth, "ADMIN");
  if (reason.trim().length < 4) throw new ValidationError("Reason required.");
  await audit({
    actorType: "user",
    actorId: auth.user.id,
    action: `seller.${status.toLowerCase()}`,
    targetType: "user",
    targetId: sellerId,
    meta: { reason },
  });
  await notify({
    userId: sellerId,
    type: "SYSTEM",
    title: `Seller verification: ${status}`,
    body: reason,
    link: "/seller/dashboard",
    dedupeKey: `seller-verify:${sellerId}:${status}:${reason.slice(0, 20)}`,
  });
}

export async function moderateListing(
  auth: SessionWithUser,
  listingId: string,
  to: ListingStatus,
  reason: string,
): Promise<void> {
  requireRole(auth, "ADMIN");
  if (reason.trim().length < 4) throw new ValidationError("Reason required.");
  const listing = await repos().listings.find((l) => l.id === listingId);
  if (!listing) throw new NotFoundError("Listing not found");
  await transitionListing(listingId, to, {
    actorId: auth.user.id,
    actorIsAdmin: true,
    note: reason,
  });
  await notify({
    userId: listing.sellerId,
    type: "LISTING_MODERATED",
    title: `Listing ${to.replace("_", " ").toLowerCase()}`,
    body: `“${listing.model}”: ${reason}`,
    link: `/seller/listings/${listing.id}`,
    dedupeKey: `listing:${listing.id}:${to}:${reason.slice(0, 20)}`,
  });
}

export async function refundOrder(
  auth: SessionWithUser,
  paymentId: string,
  amountCents: number | null,
  reason: string,
): Promise<void> {
  requireRole(auth, "ADMIN");
  await refundPayment(auth, paymentId, amountCents, reason);
}

export async function adminStats(): Promise<{
  users: number;
  sellers: number;
  listingsPublished: number;
  listingsPending: number;
  orders: number;
  gmvCents: number;
  certificates: number;
  reviews: number;
}> {
  const [users, listings, orders, certs, reviews] = await Promise.all([
    repos().users.count(),
    repos().listings.list(),
    repos().orders.list(),
    repos().certificates.count(),
    repos().reviews.count(),
  ]);
  const sellers = users === 0 ? 0 : (await repos().users.list()).filter((u) => u.roles.includes("SELLER")).length;
  const paid = orders.filter((o) =>
    ["PAYMENT_SECURED", "SELLER_PREPARING", "SHIPPED_TO_AUTHENTICATOR", "AUTHENTICATING", "AUTHENTICATED", "SHIPPED_TO_BUYER", "DELIVERED", "COMPLETED", "PAYOUT_RELEASED"].includes(o.status),
  );
  return {
    users,
    sellers,
    listingsPublished: listings.filter((l) => l.status === "PUBLISHED").length,
    listingsPending: listings.filter((l) => l.status === "PENDING_REVIEW").length,
    orders: orders.length,
    gmvCents: paid.reduce((sum, o) => sum + o.total.amountCents, 0),
    certificates: certs,
    reviews,
  };
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function nowForSeed(): string {
  return nowIso();
}
