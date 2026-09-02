/**
 * Digital Watch Passport — created exactly once when an order reaches COMPLETED.
 * Sensitive fields (full serial) are only resolved through authorized accessors.
 */

import { ForbiddenError, NotFoundError } from "@/core/errors";
import { maskSerial } from "@/lib/auth/tokens";
import type { Order, WatchPassport } from "@/domain/entities";
import { repos } from "@/data/repositories";
import { isAdmin, type SessionWithUser } from "@/lib/auth/rbac";
import { getListingById } from "./listing-service";

export const passportService = {
  async createForOrder(order: Order): Promise<WatchPassport> {
    const existing = await repos().passports.find((p) => p.orderId === order.id);
    if (existing) return existing; // idempotent
    const listing = await getListingById(order.listingId);
    const certificate = await repos().certificates.find((c) => c.orderId === order.id);
    return repos().passports.create({
      listingId: order.listingId,
      orderId: order.id,
      ownerId: order.buyerId,
      serialMasked: maskSerial(listing.serialNumber),
      certificateId: certificate?.id ?? null,
      serviceHistory: listing.serviceHistory
        ? [{ at: new Date().toISOString(), note: listing.serviceHistory, by: "Seller record" }]
        : [],
      documents: listing.documentation.map((name) => ({ name, path: `docs/${order.id}/${name}` })),
      authenticationStatus: "CERTIFIED",
    });
  },

  async getById(passportId: string): Promise<WatchPassport> {
    const passport = await repos().passports.find((p) => p.id === passportId);
    if (!passport) throw new NotFoundError("Passport not found");
    return passport;
  },

  /**
   * Ownership gate: owner or ADMIN/AUTHENTICATOR may view sensitive details.
   * Public viewers (by link) only get the non-sensitive subset.
   */
  assertCanViewSensitive(auth: SessionWithUser | null, passport: WatchPassport): boolean {
    if (!auth) return false;
    if (passport.ownerId === auth.user.id) return true;
    return isAdmin(auth.user) || auth.user.roles.includes("AUTHENTICATOR");
  },
};

export async function getPassportForOrder(orderId: string): Promise<WatchPassport | null> {
  const found = await repos().passports.find((p) => p.orderId === orderId);
  return found ?? null;
}

export function assertOwner(auth: SessionWithUser, ownerId: string): void {
  if (auth.user.id !== ownerId && !isAdmin(auth.user)) {
    throw new ForbiddenError("Not your passport.");
  }
}
