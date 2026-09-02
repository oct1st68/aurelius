/**
 * Offer service — negotiation with transaction-safe acceptance.
 *
 * acceptOffer runs inside withLocks(offers, listings, orders) so two buyers
 * racing to accept... actually only the seller accepts; the race we prevent is
 * seller+another-offer, and double-accept of the same offer. Accepting:
 *   1. re-validates offer is PENDING/not expired, listing is PUBLISHED
 *   2. marks offer ACCEPTED (single mutate — second accept hits status guard)
 *   3. reserves the listing (PUBLISHED → RESERVED)
 *   4. invalidates competing PENDING offers on the same listing (EXPIRED)
 *   5. creates a PENDING_PAYMENT order bound to the offer
 */

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/core/errors";
import { money, type CurrencyCode, type Money } from "@/core/money";
import { addDays, nowIso } from "@/core/time";
import type { Listing, Offer, Order } from "@/domain/entities";
import type { OfferStatus } from "@/domain/enums";
import { repos } from "@/data/repositories";
import { withLocks } from "@/data/store/lock";
import { hasRole, isAdmin, type SessionWithUser } from "@/lib/auth/rbac";
import { audit } from "./audit-service";
import { notify } from "./notification-service";
import { transitionListing } from "./listing-service";

export interface CreateOfferInput {
  listingId: string;
  amountCents: number;
  currency: CurrencyCode;
  message?: string;
}

export async function createOffer(auth: SessionWithUser, input: CreateOfferInput): Promise<Offer> {
  if (!hasRole(auth.user, "BUYER")) {
    throw new ForbiddenError("Buyer role required to make offers.");
  }
  const amount = money(input.amountCents, input.currency);
  if (amount.amountCents <= 0) throw new ValidationError("Offer amount must be positive.");
  if (input.message && input.message.length > 500) {
    throw new ValidationError("Message too long (max 500 chars).");
  }

  const listing = await repos().listings.find((l) => l.id === input.listingId);
  if (!listing) throw new NotFoundError("Listing not found");
  if (listing.status !== "PUBLISHED") {
    throw new ConflictError("Offers can only be made on active listings.");
  }
  if (listing.sellerId === auth.user.id) {
    throw new ConflictError("You cannot make an offer on your own watch.");
  }
  if (amount.amountCents >= listing.price.amountCents) {
    throw new ValidationError(
      "Your offer is at or above the asking price — use Buy Now instead.",
    );
  }

  const threadId = generateThreadId();
  const offer = await repos().offers.create({
    listingId: listing.id,
    buyerId: auth.user.id,
    amount,
    status: "PENDING",
    threadId,
    parentOfferId: null,
    expiresAt: addDays(nowIso(), 7),
    respondedAt: null,
    message: input.message?.trim() ?? null,
    orderId: null,
  });

  await notify({
    userId: listing.sellerId,
    type: "OFFER_RECEIVED",
    title: "New offer received",
    body: `An offer of ${(amount.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: amount.currency })} was made on “${listing.model}”.`,
    link: "/seller/offers",
    dedupeKey: `offer-received:${offer.id}`,
  });
  await audit({
    actorType: "user",
    actorId: auth.user.id,
    action: "offer.created",
    targetType: "offer",
    targetId: offer.id,
    meta: { listingId: listing.id },
  });
  return offer;
}

function generateThreadId(): string {
  return `thr_${Math.random().toString(36).slice(2, 12)}`;
}

async function getOffer(offerId: string): Promise<Offer> {
  const offer = await repos().offers.find((o) => o.id === offerId);
  if (!offer) throw new NotFoundError("Offer not found");
  return offer;
}

/** Common prechecks for seller actions. Returns the listing. */
async function assertSellerCanRespond(
  auth: SessionWithUser,
  offer: Offer,
): Promise<Listing> {
  const listing = await repos().listings.find((l) => l.id === offer.listingId);
  if (!listing) throw new NotFoundError("Listing not found");
  if (listing.sellerId !== auth.user.id && !isAdmin(auth.user)) {
    throw new ForbiddenError("Only the seller who owns this listing can respond.");
  }
  return listing;
}

export async function sellerAcceptOffer(
  auth: SessionWithUser,
  offerId: string,
): Promise<Order> {
  return withLocks(
    ["collection:offers", "collection:listings", "collection:orders"],
    async () => {
      const offer = await getOffer(offerId);
      const listing = await assertSellerCanRespond(auth, offer);
      if (offer.status !== "PENDING") {
        throw new ConflictError(`This offer is ${offer.status.toLowerCase()} and cannot be accepted.`);
      }
      if (offer.expiresAt <= nowIso()) throw new ConflictError("This offer has expired.");
      if (listing.status !== "PUBLISHED") {
        throw new ConflictError("This watch is no longer available.");
      }

      // 1. Accept — mutate guards against double-accept (status changes under lock).
      const accepted = await repos().offers.mutate(offer.id, (o) => {
        if (o.status !== "PENDING") return null; // someone beat us to it
        return { ...o, status: "ACCEPTED", respondedAt: nowIso(), updatedAt: nowIso() };
      });
      if (!accepted) throw new ConflictError("This offer was just handled by someone else.");

      // 2. Reserve the listing (system transition, no actor).
      await transitionListing(listing.id, "RESERVED", { actorId: null, actorType: "system" });

      // 3. Invalidate competing offers.
      const competing = await repos().offers.findMany(
        (o) => o.listingId === listing.id && o.id !== offer.id && o.status === "PENDING",
      );
      for (const other of competing) {
        await repos().offers.update(other.id, { status: "EXPIRED", respondedAt: nowIso() });
      }

      // 4. Create the order (escrow-like flow starts at PENDING_PAYMENT).
      const order = await repos().orders.create({
        listingId: listing.id,
        buyerId: offer.buyerId,
        sellerId: listing.sellerId,
        itemPrice: offer.amount,
        shippingCost: money(0, offer.amount.currency),
        insuranceCost: money(0, offer.amount.currency),
        total: offer.amount,
        currency: offer.amount.currency,
        status: "PENDING_PAYMENT",
        timeline: [
          {
            id: `evt_${Math.random().toString(36).slice(2, 10)}`,
            at: nowIso(),
            from: null,
            to: "PENDING_PAYMENT",
            note: "Order created from accepted offer",
            actorId: auth.user.id,
          },
        ],
        shippingAddress: {
          fullName: "",
          line1: "",
          line2: null,
          city: "",
          postalCode: "",
          country: "",
          phone: null,
        },
        offerId: offer.id,
        certificateId: null,
        passportId: null,
        checkoutIdempotencyKey: null,
        trackingNumber: null,
      });
      await repos().offers.update(offer.id, { orderId: order.id });

      await notify({
        userId: offer.buyerId,
        type: "OFFER_ACCEPTED",
        title: "Your offer was accepted",
        body: `Complete checkout for “${listing.model}” within 72h.`,
        link: `/checkout/${order.id}`,
        dedupeKey: `offer-accepted:${offer.id}`,
      });
      await audit({
        actorType: "user",
        actorId: auth.user.id,
        action: "offer.accepted",
        targetType: "offer",
        targetId: offer.id,
        meta: { orderId: order.id },
      });
      return order;
    },
  );
}

export async function sellerCounterOffer(
  auth: SessionWithUser,
  offerId: string,
  counterCents: number,
  currency: CurrencyCode,
): Promise<Offer> {
  const counter = money(counterCents, currency);
  if (counter.amountCents <= 0) throw new ValidationError("Counter amount must be positive.");
  return withLocks(["collection:offers"], async () => {
    const original = await getOffer(offerId);
    await assertSellerCanRespond(auth, original);
    if (original.status !== "PENDING") {
      throw new ConflictError("Only pending offers can be countered.");
    }
    if (original.expiresAt <= nowIso()) throw new ConflictError("This offer has expired.");
    const listing = await repos().listings.find((l) => l.id === original.listingId);
    if (!listing) throw new NotFoundError("Listing not found");
    if (counter.amountCents >= listing.price.amountCents) {
      throw new ValidationError("Counter must be below the asking price.");
    }

    const countered = await repos().offers.mutate(original.id, (o) => {
      if (o.status !== "PENDING") return null;
      return { ...o, status: "COUNTERED", respondedAt: nowIso(), updatedAt: nowIso() };
    });
    if (!countered) throw new ConflictError("This offer was just handled.");

    const counterOffer = await repos().offers.create({
      listingId: original.listingId,
      buyerId: original.buyerId,
      amount: counter,
      status: "PENDING",
      threadId: original.threadId,
      parentOfferId: original.id,
      expiresAt: addDays(nowIso(), 7),
      respondedAt: null,
      message: `Seller counter-offer on “${listing.model}”.`,
      orderId: null,
    });

    await notify({
      userId: original.buyerId,
      type: "OFFER_COUNTERED",
      title: "Counter-offer received",
      body: `The seller countered with ${(counter.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: counter.currency })} on “${listing.model}”.`,
      link: "/account/offers",
      dedupeKey: `offer-counter:${counterOffer.id}`,
    });
    return counterOffer;
  });
}

export async function sellerDeclineOffer(auth: SessionWithUser, offerId: string): Promise<Offer> {
  return withLocks(["collection:offers"], async () => {
    const offer = await getOffer(offerId);
    await assertSellerCanRespond(auth, offer);
    if (offer.status !== "PENDING") throw new ConflictError("Only pending offers can be declined.");
    const updated = await repos().offers.mutate(offer.id, (o) => {
      if (o.status !== "PENDING") return null;
      return { ...o, status: "DECLINED", respondedAt: nowIso(), updatedAt: nowIso() };
    });
    if (!updated) throw new ConflictError("This offer was just handled.");
    const listing = await repos().listings.find((l) => l.id === offer.listingId);
    if (listing) {
      await notify({
        userId: offer.buyerId,
        type: "OFFER_DECLINED",
        title: "Offer declined",
        body: `The seller declined your offer on “${listing.model}”.`,
        link: `/watches/${listing.slug}`,
        dedupeKey: `offer-declined:${offer.id}`,
      });
    }
    await audit({
      actorType: "user",
      actorId: auth.user.id,
      action: "offer.declined",
      targetType: "offer",
      targetId: offer.id,
    });
    return updated;
  });
}

/** Buyer accepts a seller counter-offer → same transaction-safe path. */
export async function buyerAcceptCounter(
  auth: SessionWithUser,
  counterOfferId: string,
): Promise<Order> {
  return withLocks(
    ["collection:offers", "collection:listings", "collection:orders"],
    async () => {
      const offer = await getOffer(counterOfferId);
      if (offer.buyerId !== auth.user.id) {
        throw new ForbiddenError("This counter-offer is not yours.");
      }
      const listing = await repos().listings.find((l) => l.id === offer.listingId);
      if (!listing) throw new NotFoundError("Listing not found");
      if (offer.status !== "PENDING" || offer.parentOfferId === null) {
        throw new ConflictError("Only pending counter-offers can be accepted.");
      }
      if (offer.expiresAt <= nowIso()) throw new ConflictError("This counter-offer has expired.");
      if (listing.status !== "PUBLISHED") {
        throw new ConflictError("This watch is no longer available.");
      }

      const accepted = await repos().offers.mutate(offer.id, (o) => {
        if (o.status !== "PENDING") return null;
        return { ...o, status: "ACCEPTED", respondedAt: nowIso(), updatedAt: nowIso() };
      });
      if (!accepted) throw new ConflictError("This offer was just handled.");

      await transitionListing(listing.id, "RESERVED", { actorId: null, actorType: "system" });

      const competing = await repos().offers.findMany(
        (o) =>
          o.listingId === listing.id &&
          o.id !== offer.id &&
          (o.status === "PENDING" || o.status === "COUNTERED"),
      );
      for (const other of competing) {
        await repos().offers.update(other.id, { status: "EXPIRED", respondedAt: nowIso() });
      }

      const order = await repos().orders.create({
        listingId: listing.id,
        buyerId: offer.buyerId,
        sellerId: listing.sellerId,
        itemPrice: offer.amount,
        shippingCost: money(0, offer.amount.currency),
        insuranceCost: money(0, offer.amount.currency),
        total: offer.amount,
        currency: offer.amount.currency,
        status: "PENDING_PAYMENT",
        timeline: [
          {
            id: `evt_${Math.random().toString(36).slice(2, 10)}`,
            at: nowIso(),
            from: null,
            to: "PENDING_PAYMENT",
            note: "Order created from accepted counter-offer",
            actorId: auth.user.id,
          },
        ],
        shippingAddress: {
          fullName: "",
          line1: "",
          line2: null,
          city: "",
          postalCode: "",
          country: "",
          phone: null,
        },
        offerId: offer.id,
        certificateId: null,
        passportId: null,
        checkoutIdempotencyKey: null,
        trackingNumber: null,
      });
      await repos().offers.update(offer.id, { orderId: order.id });

      await notify({
        userId: listing.sellerId,
        type: "OFFER_ACCEPTED",
        title: "Counter-offer accepted",
        body: `“${listing.model}” is reserved — awaiting buyer checkout.`,
        link: `/seller/orders/${order.id}`,
        dedupeKey: `offer-counter-accepted:${offer.id}`,
      });
      return order;
    },
  );
}

export async function buyerCancelOffer(auth: SessionWithUser, offerId: string): Promise<Offer> {
  return withLocks(["collection:offers"], async () => {
    const offer = await getOffer(offerId);
    if (offer.buyerId !== auth.user.id) throw new ForbiddenError("Not your offer.");
    if (offer.status !== "PENDING") throw new ConflictError("Only pending offers can be cancelled.");
    const updated = await repos().offers.mutate(offer.id, (o) => {
      if (o.status !== "PENDING") return null;
      return { ...o, status: "CANCELLED", respondedAt: nowIso(), updatedAt: nowIso() };
    });
    if (!updated) throw new ConflictError("This offer was just handled.");
    return updated;
  });
}

/** Called lazily (list views) — marks expired offers. */
export async function sweepExpiredOffers(): Promise<number> {
  const at = nowIso();
  const expired = await repos().offers.findMany(
    (o) => o.status === "PENDING" && o.expiresAt <= at,
  );
  for (const offer of expired) {
    await repos().offers.update(offer.id, { status: "EXPIRED", respondedAt: at });
  }
  return expired.length;
}

export interface OfferView {
  offer: Offer;
  listing: Listing;
}

export async function listOffersForBuyer(buyerId: string): Promise<OfferView[]> {
  await sweepExpiredOffers();
  const offers = await repos().offers.findMany((o) => o.buyerId === buyerId);
  return attachListings(offers);
}

export async function listOffersForSeller(sellerId: string): Promise<OfferView[]> {
  await sweepExpiredOffers();
  const listings = await repos().listings.findMany((l) => l.sellerId === sellerId);
  const listingIds = new Set(listings.map((l) => l.id));
  const offers = await repos().offers.findMany((o) => listingIds.has(o.listingId));
  return attachListings(offers);
}

async function attachListings(offers: Offer[]): Promise<OfferView[]> {
  const views: OfferView[] = [];
  for (const offer of offers) {
    const listing = await repos().listings.find((l) => l.id === offer.listingId);
    if (listing) views.push({ offer, listing });
  }
  return views.sort((a, b) => b.offer.createdAt.localeCompare(a.offer.createdAt));
}

export function canRespondToOffer(auth: SessionWithUser, offer: Offer, listing: Listing): boolean {
  return isAdmin(auth.user) || listing.sellerId === auth.user.id;
}

export function offerStatusLabel(status: OfferStatus): string {
  const map: Record<OfferStatus, string> = {
    PENDING: "Pending",
    COUNTERED: "Countered",
    ACCEPTED: "Accepted",
    DECLINED: "Declined",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
  };
  return map[status];
}

export type { Money };
