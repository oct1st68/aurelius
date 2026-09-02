/**
 * Integration tests — services against an isolated temp data directory.
 * These run the real LocalJsonStore, repositories, and business services.
 *
 * Isolation note: each test file process points AURELIUS_DATA_DIR at a fresh
 * temp dir (vitest setup.ts) and creates its own LocalJsonStore instances.
 */

import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalJsonStore } from "@/data/store/local-json-store";
import { JsonCollectionRepository } from "@/data/repositories/base-repository";
import { register, login, requestPasswordReset, resetPassword } from "@/lib/auth/auth-service";
import {
  createListing,
  queryCatalog,
  transitionListing,
  getListingById,
} from "@/lib/services/listing-service";
import { createOffer, sellerAcceptOffer, sellerDeclineOffer } from "@/lib/services/offer-service";
import { addToCart, getCart, removeFromCart, saveToVault, getVault } from "@/lib/services/cart-service";
import { checkoutOrder, createDirectOrder, quoteFor } from "@/lib/services/checkout-service";
import { transitionOrder, getOrder } from "@/lib/services/order-service";
import { recordInspection, queueInspection } from "@/lib/services/certificate-service";
import { createReview } from "@/lib/services/review-service";
import { notify, markAllRead, unreadCount } from "@/lib/services/notification-service";
import { payoutService } from "@/lib/services/payout-service";
import { setRepositories } from "@/data/repositories";
import type { Repositories } from "@/data/repositories";
import { ORDER_HAPPY_PATH } from "@/domain/enums";
import type { User } from "@/domain/entities";
import type { SessionWithUser } from "@/lib/auth/session-service";
import { ForbiddenError, ConflictError, UnauthenticatedError, ValidationError } from "@/core/errors";
import { nowIso, addDays } from "@/core/time";

let dataDir: string;
let store: LocalJsonStore;

interface Row {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

function freshRepos(): Repositories {
  return {
    users: new JsonCollectionRepository("users", "usr", ["email"], store),
    sessions: new JsonCollectionRepository("sessions", "ses", [], store),
    resetTokens: new JsonCollectionRepository("reset-tokens", "rt", [], store),
    roles: new JsonCollectionRepository("roles", "prf", ["name"], store),
    brands: new JsonCollectionRepository("brands", "brd", ["slug"], store),
    listings: new JsonCollectionRepository("listings", "wat", ["slug"], store),
    priceHistory: new JsonCollectionRepository("price-history", "prf", [], store),
    offers: new JsonCollectionRepository("offers", "off", [], store),
    cartItems: new JsonCollectionRepository("cart-items", "car", [], store),
    vaultEntries: new JsonCollectionRepository("vault-entries", "vault", [], store),
    orders: new JsonCollectionRepository("orders", "ord", [], store),
    payments: new JsonCollectionRepository("payments", "pay", ["idempotencyKey"], store),
    payouts: new JsonCollectionRepository("payouts", "pay", [], store),
    inspections: new JsonCollectionRepository("inspections", "cert", [], store),
    certificates: new JsonCollectionRepository("certificates", "cert", ["certificateNumber"], store),
    passports: new JsonCollectionRepository("passports", "passport", [], store),
    reviews: new JsonCollectionRepository("reviews", "rev", ["orderId"], store),
    notifications: new JsonCollectionRepository("notifications", "notif", [], store),
    articles: new JsonCollectionRepository("articles", "art", ["slug"], store),
    emails: new JsonCollectionRepository("emails", "email", [], store),
    auditEvents: new JsonCollectionRepository("audit-events", "aud", [], store),
    uploadedImages: new JsonCollectionRepository("uploaded-images", "img", [], store),
  };
}

let repos: Repositories;


// Typed helpers: real domain types, real session shape.
type TestUser = User;
type TestSession = SessionWithUser;

function sessionOf(user: TestUser): TestSession {
  const { randomUUID } = require("node:crypto") as { randomUUID: () => string };
  void randomUUID;
  return {
    session: {
      id: `ses_${user.id.slice(-6)}`,
      userId: user.id,
      tokenHash: "test",
      expiresAt: "2099-01-01T00:00:00.000Z",
      revokedAt: null,
      userAgent: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    user,
  };
}


interface BrandRow {
  id: string;
}

async function seedBrand(): Promise<BrandRow> {
  const brand = await repos.brands.create({
    name: "Test House",
    slug: `test-house-${Math.random().toString(36).slice(2, 7)}`,
    country: "Switzerland",
    foundedYear: 1900,
    story: "A test house.",
    heroImage: "media/test.svg",
  });
  return brand;
}

const BASE_LISTING = {
  model: "Test Model",
  referenceNumber: "TM-100",
  year: 2020,
  movement: "Automatic" as const,
  caseMaterial: "Steel",
  caseDiameterMm: 39,
  dialColor: "Black",
  bracelet: "Leather",
  waterResistanceM: 50,
  functions: ["Date"],
  powerReserveHours: 70,
  conditionGrade: "MINT" as const,
  conditionNotes: "Like new",
  boxAndPapers: "FULL_SET" as const,
  documentation: ["Warranty"],
  serviceHistory: "None",
  images: [{ id: "img_1", path: "media/test.svg", alt: "test", width: 1200, height: 1500 }],
  priceCents: 500_000,
  currency: "USD" as const,
  collections: [] as never[],
  serialNumber: "SN12345678",
  description: "A test watch with a sufficiently long description for validation.",
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "aurelius-it-"));
  store = new LocalJsonStore(dataDir);
  await store.ensureDir();
  repos = freshRepos();
  setRepositories(repos);
});

afterEach(async () => {
  setRepositories(undefined);
  await rm(dataDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// LocalJsonStore behavior
// ---------------------------------------------------------------------------

describe("LocalJsonStore", () => {
  it("returns empty for missing files", async () => {
    expect(await store.readCollection("nothing")).toEqual([]);
  });

  it("quarantines malformed files and recovers", async () => {
    await store.writeCollection("broken", [{ id: "x" }]);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(dataDir, "broken.json"), "{not json", "utf8");
    expect(await store.readCollection("broken")).toEqual([]);
  });

  it("writes atomically (no temp files left behind)", async () => {
    await store.writeCollection("clean", [1, 2, 3]);
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(dataDir);
    expect(files.every((f) => !f.endsWith(".tmp"))).toBe(true);
    expect(await store.readCollection("clean")).toEqual([1, 2, 3]);
  });
});

describe("repositories: unique constraints", () => {
  it("rejects duplicate emails", async () => {
    await repos.users.create({ email: "dupe@test.local", passwordHash: "h", displayName: "Alpha", roles: ["USER"], status: "ACTIVE", accent: "#fff" });
    await expect(
      repos.users.create({ email: "dupe@test.local", passwordHash: "h", displayName: "Beta", roles: ["USER"], status: "ACTIVE", accent: "#fff" }),
    ).rejects.toThrow(ConflictError);
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe("auth flow", () => {
  it("registers, logs in, and rejects wrong passwords", async () => {
    const { user, sessionToken } = await register({
      email: "auth@test.local",
      password: "GoodPass123",
      displayName: "Tester",
    });
    expect(user.id.startsWith("usr_")).toBe(true);
    expect(sessionToken.length).toBeGreaterThan(20);
    // Hash, never plaintext
    const stored = await repos.users.find((u) => u.email === "auth@test.local");
    expect(stored?.passwordHash).not.toContain("GoodPass123");

    const ok = await login({ email: "auth@test.local", password: "GoodPass123" });
    expect(ok.user.id).toBe(user.id);
    await expect(login({ email: "auth@test.local", password: "wrong" })).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it("rejects weak passwords and duplicate emails", async () => {
    await expect(
      register({ email: "weak@test.local", password: "short", displayName: "Weak" }),
    ).rejects.toThrow(ValidationError);
    await register({ email: "take@test.local", password: "GoodPass123", displayName: "Taker" });
    await expect(
      register({ email: "take@test.local", password: "GoodPass123", displayName: "Taker2" }),
    ).rejects.toThrow(ConflictError);
  });

  it("reset password: request → reset → old sessions revoked", async () => {
    const { user } = await register({ email: "reset@test.local", password: "OldPass123", displayName: "Resetter" });
    const token = await requestPasswordReset("reset@test.local");
    expect(token).toBeTruthy();
    await resetPassword(token, "NewPass456");
    // old password fails, new works
    await expect(login({ email: "reset@test.local", password: "OldPass123" })).rejects.toThrow(UnauthenticatedError);
    const ok = await login({ email: "reset@test.local", password: "NewPass456" });
    expect(ok.user.id).toBe(user.id);
    // token cannot be reused
    await expect(resetPassword(token, "Again789")).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

describe("listing lifecycle", () => {
  it("seller cannot self-approve; admin can", async () => {
    const brand = await seedBrand();
    const seller = await register({
      email: "seller-lc@test.local",
      password: "GoodPass123",
      displayName: "Seller",
      roles: ["USER", "SELLER"] as never,
    }).then((r) => r.user);
    const auth = sessionOf(seller);

    const listing = await createListing(auth, { ...BASE_LISTING, sellerId: seller.id, brandId: brand.id, isDraft: false });
    expect(listing.status).toBe("PENDING_REVIEW");

    // Seller tries to self-approve → FORBIDDEN
    await expect(
      transitionListing(listing.id, "APPROVED", {
        actorId: seller.id,
        actorIsAdmin: false,
      }),
    ).rejects.toThrow(ForbiddenError);

    // Admin approves → publishes
    await transitionListing(listing.id, "APPROVED", { actorId: "admin", actorIsAdmin: true });
    const published = await transitionListing(listing.id, "PUBLISHED", {
      actorId: "admin",
      actorIsAdmin: true,
    });
    expect(published.status).toBe("PUBLISHED");
  });

  it("catalog filters and paginates", async () => {
    const brand = await seedBrand();
    const seller = await register({
      email: "seller-cat@test.local",
      password: "GoodPass123",
      displayName: "Seller",
      roles: ["USER", "SELLER"] as never,
    }).then((r) => r.user);
    const auth = sessionOf(seller);
    for (let i = 0; i < 3; i++) {
      const l = await createListing(auth, {
        ...BASE_LISTING,
        sellerId: seller.id,
        brandId: brand.id,
        model: `Model ${i}`,
        referenceNumber: `TM-${100 + i}`,
        isDraft: false,
      });
      await transitionListing(l.id, "APPROVED", { actorId: "admin", actorIsAdmin: true });
      await transitionListing(l.id, "PUBLISHED", { actorId: "admin", actorIsAdmin: true });
    }
    const page = await queryCatalog({ perPage: 2, sort: "newest" });
    expect(page.total).toBe(3);
    expect(page.items.length).toBe(2);
    expect(page.totalPages).toBe(2);
  });

  it("rejects illegal listing transitions", async () => {
    const brand = await seedBrand();
    const seller = await register({
      email: "seller-tr@test.local",
      password: "GoodPass123",
      displayName: "Seller",
      roles: ["USER", "SELLER"] as never,
    }).then((r) => r.user);
    const auth = sessionOf(seller);
    const listing = await createListing(auth, { ...BASE_LISTING, sellerId: seller.id, brandId: brand.id, isDraft: true });
    await expect(
      transitionListing(listing.id, "PUBLISHED", { actorId: "admin", actorIsAdmin: true }),
    ).rejects.toThrow(ConflictError);
  });
});

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

async function makePublishedListing(sellerEmail: string) {
  const brand = await seedBrand();
  const seller = await register({
    email: sellerEmail,
    password: "GoodPass123",
    displayName: "Seller",
    roles: ["USER", "SELLER"] as never,
  }).then((r) => r.user);
  const auth = sessionOf(seller);
  const listing = await createListing(auth, { ...BASE_LISTING, sellerId: seller.id, brandId: brand.id, isDraft: false });
  await transitionListing(listing.id, "APPROVED", { actorId: "admin", actorIsAdmin: true });
  await transitionListing(listing.id, "PUBLISHED", { actorId: "admin", actorIsAdmin: true });
  return { seller, listing, sellerAuth: auth };
}

describe("offers", () => {
  it("creates, declines, and guards own-listing offers", async () => {
    const { listing, seller } = await makePublishedListing("offer-s1@test.local");
    const buyer = await register({
      email: "offer-b1@test.local",
      password: "GoodPass123",
      displayName: "Buyer",
    }).then((r) => r.user);
    const buyerAuth = sessionOf(buyer);
    const sellerAuth = sessionOf(seller);

    const offer = await createOffer(buyerAuth, {
      listingId: listing.id,
      amountCents: 400_000,
      currency: "USD",
    });
    expect(offer.status).toBe("PENDING");

    // Seller lacks the BUYER role, so the role guard fires first.
    // Give the seller BUYER too — the own-listing guard must still fire.
    const sellerWithBuyer = { ...seller, roles: [...(seller as { roles: string[] }).roles, "BUYER"] } as never;
    await expect(
      createOffer(sessionOf(sellerWithBuyer), {
        listingId: listing.id,
        amountCents: 400_000,
        currency: "USD",
      }),
    ).rejects.toThrow(ConflictError); // own watch

    await expect(
      createOffer(buyerAuth, { listingId: listing.id, amountCents: 0, currency: "USD" }),
    ).rejects.toThrow(ValidationError);

    const declined = await sellerDeclineOffer(sellerAuth, offer.id);
    expect(declined.status).toBe("DECLINED");
  });

  it("accepting reserves the listing, invalidates competitors, creates order", async () => {
    const { listing, seller } = await makePublishedListing("offer-s2@test.local");
    const buyerA = await register({
      email: "offer-b2a@test.local",
      password: "GoodPass123",
      displayName: "Alpha",
    }).then((r) => r.user);
    const buyerB = await register({
      email: "offer-b2b@test.local",
      password: "GoodPass123",
      displayName: "Beta",
    }).then((r) => r.user);

    const offerA = await createOffer(sessionOf(buyerA), {
      listingId: listing.id,
      amountCents: 400_000,
      currency: "USD",
    });
    const offerB = await createOffer(sessionOf(buyerB), {
      listingId: listing.id,
      amountCents: 420_000,
      currency: "USD",
    });

    const order = await sellerAcceptOffer(sessionOf(seller), offerA.id);
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.buyerId).toBe(buyerA.id);
    expect((await getListingById(listing.id)).status).toBe("RESERVED");

    const bAfter = await repos.offers.getById(offerB.id);
    expect(bAfter.status).toBe("EXPIRED");

    // Double-accept is refused
    await expect(sellerAcceptOffer(sessionOf(seller), offerA.id)).rejects.toThrow(ConflictError);
  });
});

// ---------------------------------------------------------------------------
// Cart & vault
// ---------------------------------------------------------------------------

describe("cart & vault (server-side)", () => {
  it("adds, dedupes, removes", async () => {
    const { listing, seller } = await makePublishedListing("cart-s@test.local");
    const buyer = await register({
      email: "cart-b@test.local",
      password: "GoodPass123",
      displayName: "Beta",
    }).then((r) => r.user);
    const auth = sessionOf(buyer);
    void seller;

    await addToCart(auth, listing.id);
    await addToCart(auth, listing.id); // idempotent
    expect((await getCart(buyer.id)).length).toBe(1);
    await removeFromCart(auth, listing.id);
    expect((await getCart(buyer.id)).length).toBe(0);
  });

  it("vault entries are per-user and server-persisted", async () => {
    const { listing } = await makePublishedListing("vault-s@test.local");
    const buyer = await register({
      email: "vault-b@test.local",
      password: "GoodPass123",
      displayName: "Beta",
    }).then((r) => r.user);
    const auth = sessionOf(buyer);
    await saveToVault(auth, listing.id, "watch this");
    const vault = await getVault(buyer.id);
    expect(vault.length).toBe(1);
    expect(vault[0]?.entry.note).toBe("watch this");
  });
});

// ---------------------------------------------------------------------------
// Checkout & payment
// ---------------------------------------------------------------------------

describe("checkout with mock payment", () => {
  async function buyerAndOrder(listingId: string) {
    const buyer = await register({
      email: `co-${Math.random().toString(36).slice(2, 7)}@test.local`,
      password: "GoodPass123",
      displayName: "Buyer",
    }).then((r) => r.user);
    const auth = sessionOf(buyer);
    const order = await createDirectOrder(auth, listingId);
    return { buyer, auth, order };
  }

  const goodCheckout = (orderId: string) => ({
    orderId,
    shipping: {
      fullName: "Test Buyer",
      line1: "1 Test Street",
      line2: null,
      city: "Rome",
      postalCode: "00186",
      country: "Italy",
      phone: null,
    },
    cardNumber: "4242424242424242",
    cardExpMonth: 12,
    cardExpYear: new Date().getFullYear() + 1,
    cardCvc: "123",
    cardholderName: "Test Buyer",
    idempotencyKey: `idem_${Math.random().toString(36).slice(2)}`,
  });

  it("successful payment advances order to PAYMENT_SECURED and sells the listing", async () => {
    const { listing } = await makePublishedListing("co-s1@test.local");
    const { auth, order } = await buyerAndOrder(listing.id);
    const result = await checkoutOrder(auth, goodCheckout(order.id));
    expect(result.payment.status).toBe("SUCCEEDED");
    expect(result.order.status).toBe("PAYMENT_SECURED");
    expect((await getListingById(listing.id)).status).toBe("SOLD");
  });

  it("declined card leaves order PENDING_PAYMENT and payment DECLINED", async () => {
    const { listing } = await makePublishedListing("co-s2@test.local");
    const { auth, order } = await buyerAndOrder(listing.id);
    await expect(
      checkoutOrder(auth, { ...goodCheckout(order.id), cardNumber: "4000000000000002" }),
    ).rejects.toThrow(/declined/i);
    expect((await getOrder(order.id)).status).toBe("PENDING_PAYMENT");
    const payment = await repos.payments.find((p) => p.orderId === order.id);
    expect(payment?.status).toBe("DECLINED");
  });

  it("idempotency key prevents double charge", async () => {
    const { listing } = await makePublishedListing("co-s3@test.local");
    const { auth, order } = await buyerAndOrder(listing.id);
    const input = goodCheckout(order.id);
    const first = await checkoutOrder(auth, input);
    const second = await checkoutOrder(auth, input);
    expect(second.payment.id).toBe(first.payment.id);
    const payments = await repos.payments.findMany((p) => p.orderId === order.id);
    expect(payments.length).toBe(1);
  });

  it("quote math: shipping flat + 1% insurance", () => {
    const quote = quoteFor({
      itemPrice: { amountCents: 500_000, currency: "USD" },
      currency: "USD",
    } as never);
    expect(quote.shippingCost.amountCents).toBe(7_500);
    expect(quote.insuranceCost.amountCents).toBe(5_000);
    expect(quote.total.amountCents).toBe(512_500);
  });
});

// ---------------------------------------------------------------------------
// Full escrow-like journey
// ---------------------------------------------------------------------------

describe("escrow-like order journey", () => {
  it("walks the happy path to PAYOUT_RELEASED with certificate, passport, payout, review", async () => {
    const { listing, seller } = await makePublishedListing("j-s@test.local");
    const buyer = await register({
      email: "j-b@test.local",
      password: "GoodPass123",
      displayName: "Buyer",
    }).then((r) => r.user);
    const buyerAuth = sessionOf(buyer);
    const authenticator = await register({
      email: "j-a@test.local",
      password: "GoodPass123",
      displayName: "Auth",
      roles: ["USER", "AUTHENTICATOR"] as never,
    }).then((r) => r.user);
    const authAuth = sessionOf(authenticator);

    // 1. Buy now
    const order = await createDirectOrder(buyerAuth, listing.id);

    // 2. Pay
    await checkoutOrder(buyerAuth, {
      orderId: order.id,
      shipping: {
        fullName: "J Buyer",
        line1: "1 Way",
        line2: null,
        city: "Rome",
        postalCode: "00186",
        country: "Italy",
        phone: null,
      },
      cardNumber: "4242424242424242",
      cardExpMonth: 12,
      cardExpYear: new Date().getFullYear() + 1,
      cardCvc: "123",
      cardholderName: "J Buyer",
      idempotencyKey: `j_${Math.random().toString(36).slice(2)}`,
    });

    // 3. Seller prepares & ships to authenticator
    await transitionOrder({ orderId: order.id, to: "SELLER_PREPARING", actor: sessionOf(seller), note: "preparing" });
    await transitionOrder({
      orderId: order.id,
      to: "SHIPPED_TO_AUTHENTICATOR",
      actor: sessionOf(seller),
      note: "shipped to atelier",
    });

    // 4. Inspection queue exists (created by test); record approval
    const inspection = await queueInspection(order.id);
    const { certificate } = await recordInspection(authAuth, {
      inspectionId: inspection.id,
      outcome: "APPROVED",
      checklist: { movement: true, authenticity: true, condition: true, timekeeping: true },
      notes: "All correct. Movement original, serial matches records.",
    });
    expect(certificate?.certificateNumber).toMatch(/^AUR-\d{4}-\d{6}$/);

    // 5. Seller ships to buyer; buyer confirms
    await transitionOrder({
      orderId: order.id,
      to: "SHIPPED_TO_BUYER",
      actor: sessionOf(seller),
      note: "shipped",
      trackingNumber: "TRK-1",
    });
    await transitionOrder({ orderId: order.id, to: "DELIVERED", actor: buyerAuth, note: "courier says delivered" });
    await transitionOrder({ orderId: order.id, to: "COMPLETED", actor: buyerAuth, note: "happy" });

    const completed = await getOrder(order.id);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.passportId).toBeTruthy();
    expect(completed.certificateId).toBeTruthy();

    // 6. Payout released
    const payout = await payoutService.releaseForOrder(completed, null);
    expect(payout.status).toBe("RELEASED");
    const final = await getOrder(order.id);
    expect(final.status).toBe("PAYOUT_RELEASED");

    // 7. Review (once only)
    const review = await createReview(buyerAuth, {
      orderId: order.id,
      rating: 5,
      title: "Imperial service",
      body: "Everything arrived as described and beautifully packed.",
    });
    expect(review.status).toBe("PUBLISHED");
    await expect(
      createReview(buyerAuth, {
        orderId: order.id,
        rating: 4,
        title: "Again",
        body: "Trying to review twice should fail here.",
      }),
    ).rejects.toThrow(ConflictError);

    // Full happy path matches the state machine
    expect(final.timeline.map((t) => t.to)).toEqual([...ORDER_HAPPY_PATH]);
  });

  it("rejects review before completion", async () => {
    const { listing } = await makePublishedListing("j2-s@test.local");
    const buyer = await register({
      email: "j2-b@test.local",
      password: "GoodPass123",
      displayName: "Beta",
    }).then((r) => r.user);
    const buyerAuth = sessionOf(buyer);
    const order = await createDirectOrder(buyerAuth, listing.id);
    await expect(
      createReview(buyerAuth, {
        orderId: order.id,
        rating: 5,
        title: "Too early",
        body: "This should fail because the order is not completed yet.",
      }),
    ).rejects.toThrow(ConflictError);
  });
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

describe("notifications", () => {
  it("dedupes by (user, dedupeKey)", async () => {
    const user = await register({
      email: "notif@test.local",
      password: "GoodPass123",
      displayName: "Notifier",
    }).then((r) => r.user);
    const input = {
      userId: user.id,
      type: "SYSTEM" as const,
      title: "Test",
      body: "Once only",
      dedupeKey: "same-key",
    };
    await notify(input);
    await notify(input);
    await notify(input);
    expect(await unreadCount(user.id)).toBe(1);
    expect(await markAllRead(user.id)).toBe(1);
    expect(await unreadCount(user.id)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Security: ownership & role enforcement (service level)
// ---------------------------------------------------------------------------

describe("security: server-side authorization", () => {
  it("seller A cannot transition seller B's listing", async () => {
    const { listing } = await makePublishedListing("sec-s1@test.local");
    const stranger = await register({
      email: "sec-s2@test.local",
      password: "GoodPass123",
      displayName: "Stranger",
      roles: ["USER", "SELLER"] as never,
    }).then((r) => r.user);
    await expect(
      transitionListing(listing.id, "ARCHIVED", { actorId: stranger.id, actorIsAdmin: false }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("non-authenticator cannot record inspections", async () => {
    const { listing } = await makePublishedListing("sec-s3@test.local");
    const buyer = await register({
      email: "sec-b3@test.local",
      password: "GoodPass123",
      displayName: "Beta",
    }).then((r) => r.user);
    const order = await createDirectOrder(sessionOf(buyer), listing.id);
    const inspection = await queueInspection(order.id);
    await expect(
      recordInspection(sessionOf(buyer), {
        inspectionId: inspection.id,
        outcome: "APPROVED",
        checklist: { movement: true, authenticity: true, condition: true, timekeeping: true },
        notes: "Trying to self-certify as a buyer, should fail.",
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("expired offers cannot be accepted", async () => {
    const { listing, seller } = await makePublishedListing("sec-s4@test.local");
    const buyer = await register({
      email: "sec-b4@test.local",
      password: "GoodPass123",
      displayName: "Beta",
    }).then((r) => r.user);
    const offer = await createOffer(sessionOf(buyer), {
      listingId: listing.id,
      amountCents: 400_000,
      currency: "USD",
    });
    // Force expiry
    await repos.offers.update(offer.id, { expiresAt: addDays(nowIso(), -8) });
    await expect(sellerAcceptOffer(sessionOf(seller), offer.id)).rejects.toThrow(ConflictError);
  });
});
