/**
 * Entity definitions — the "schema" of the local JSON database.
 * Money fields are integer cents. All timestamps are ISO-8601 UTC strings.
 * Each shape maps 1:1 to a future PostgreSQL table (see docs/DATABASE-MIGRATION.md).
 */

import type { BaseEntity } from "@/data/store/local-json-store";
import type {
  CurrencyCode,
  Money,
} from "@/core/money";
import type {
  InspectionStatus,
  ListingStatus,
  NotificationType,
  OfferStatus,
  OrderStatus,
  PaymentStatus,
  Permission,
  Role,
} from "./enums";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface User extends BaseEntity {
  email: string; // unique, lowercase
  passwordHash: string; // argon2 hash — plaintext never stored
  displayName: string;
  roles: Role[];
  status: "ACTIVE" | "BANNED";
  /** Demo-only avatar tint (no real profile photos needed). */
  accent: string;
}

export interface Session extends BaseEntity {
  userId: string;
  /** sha256(sessionToken) — raw token lives only in the cookie. */
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  userAgent: string | null;
}

export interface PasswordResetToken extends BaseEntity {
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
}

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

export interface RoleDefinition extends BaseEntity {
  name: Role;
  description: string;
  permissions: Permission[];
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface Brand extends BaseEntity {
  name: string;
  slug: string; // unique
  country: string;
  foundedYear: number;
  story: string;
  heroImage: string; // storage-relative media path
}

export interface WatchImage {
  id: string; // img_*
  path: string; // storage-relative path under storage/local
  alt: string;
  width: number;
  height: number;
}

export interface Listing extends BaseEntity {
  slug: string; // unique
  sellerId: string; // FK users.id
  brandId: string; // FK brands.id
  // Step I — Identity
  model: string;
  referenceNumber: string;
  year: number;
  /** Server-derived uniqueness: brandId+referenceNumber+sellerId */
  // Step II — Specifications
  movement: "Automatic" | "Manual" | "Quartz";
  caseMaterial: string;
  caseDiameterMm: number;
  dialColor: string;
  bracelet: string;
  waterResistanceM: number;
  functions: string[];
  powerReserveHours: number | null;
  // Step III — Condition
  conditionGrade: "NOS" | "MINT" | "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR";
  conditionNotes: string;
  boxAndPapers: "FULL_SET" | "BOX_ONLY" | "PAPERS_ONLY" | "NO_BOX_PAPERS";
  // Step IV — Documentation
  documentation: string[]; // uploaded doc names
  serviceHistory: string;
  // Step V — Photography
  images: WatchImage[];
  // Step VI — Pricing
  price: Money;
  /** Public listing flags */
  collections: ("SATURN" | "VINTAGE" | "SPORTS" | "DRESS" | "DIVER")[];
  serialNumber: string; // NEVER exposed unmasked without authorization
  status: ListingStatus;
  moderationNote: string | null;
  description: string;
}

export interface PricePoint {
  id: string;
  createdAt: string;
  updatedAt: string;
  listingId: string;
  at: string;
  priceCents: number;
  currency: CurrencyCode;
  kind: "LIST" | "PRICE_DROP" | "PRICE_RAISE" | "SOLD";
}

// ---------------------------------------------------------------------------
// Trade
// ---------------------------------------------------------------------------

export interface Offer extends BaseEntity {
  listingId: string;
  buyerId: string;
  amount: Money;
  status: OfferStatus;
  /** Counter-offer chain root. */
  threadId: string;
  parentOfferId: string | null;
  expiresAt: string;
  respondedAt: string | null;
  message: string | null;
  /** Set when the offer turned into an order. */
  orderId: string | null;
}

export interface CartItem extends BaseEntity {
  userId: string;
  listingId: string;
  addedAt: string;
}

export interface VaultEntry extends BaseEntity {
  userId: string;
  listingId: string;
  note: string | null;
  addedAt: string;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
}

export interface OrderTimelineEvent {
  id: string;
  at: string;
  from: OrderStatus | null;
  to: OrderStatus;
  note: string;
  actorId: string | null;
}

export interface Order extends BaseEntity {
  listingId: string;
  buyerId: string;
  sellerId: string;
  /** Agreed price (offer amount when offer-driven). */
  itemPrice: Money;
  shippingCost: Money;
  insuranceCost: Money;
  total: Money;
  currency: CurrencyCode;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  shippingAddress: ShippingAddress;
  offerId: string | null;
  certificateId: string | null;
  passportId: string | null;
  /** Idempotency key of the checkout that created/last mutated payment. */
  checkoutIdempotencyKey: string | null;
  trackingNumber: string | null;
}

export interface PaymentRefund {
  id: string;
  amountCents: number;
  reason: string;
  at: string;
}

export interface Payment extends BaseEntity {
  orderId: string;
  provider: "mock" | "stripe";
  providerRef: string;
  amount: Money;
  status: PaymentStatus;
  /** Unique per checkout attempt — the idempotency guarantee. */
  idempotencyKey: string; // unique
  refunds: PaymentRefund[];
  failureReason: string | null;
}

export interface Payout extends BaseEntity {
  sellerId: string;
  orderId: string;
  amount: Money;
  status: "PENDING" | "RELEASED";
  releasedAt: string | null;
}

// ---------------------------------------------------------------------------
// Authentication service (certification), passports, reviews
// ---------------------------------------------------------------------------

export interface Inspection extends BaseEntity {
  orderId: string;
  listingId: string;
  assignedTo: string | null; // authenticator userId
  status: InspectionStatus;
  outcomeNotes: string | null;
  checklist: { movement: boolean; authenticity: boolean; condition: boolean; timekeeping: boolean };
  completedAt: string | null;
}

export interface Certificate extends BaseEntity {
  certificateNumber: string; // unique, human-readable: AUR-2025-000123
  listingId: string;
  orderId: string;
  issuedBy: string; // authenticator userId
  result: "AUTHENTICATED" | "REVOKED";
  serialMasked: string;
  notes: string;
  issuedAt: string;
}

export interface PassportServiceEntry {
  at: string;
  note: string;
  by: string;
}

export interface WatchPassport extends BaseEntity {
  listingId: string;
  orderId: string;
  ownerId: string;
  serialMasked: string;
  certificateId: string | null;
  serviceHistory: PassportServiceEntry[];
  documents: { name: string; path: string }[];
  authenticationStatus: "CERTIFIED";
}

export interface Review extends BaseEntity {
  orderId: string; // unique — one review per completed order
  listingId: string;
  buyerId: string;
  sellerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  status: "PUBLISHED" | "HIDDEN";
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  /** Unique per (userId, dedupeKey) to prevent duplicate notifications. */
  dedupeKey: string;
}

export interface Article extends BaseEntity {
  slug: string; // unique
  title: string;
  excerpt: string;
  body: string;
  category: "GUIDE" | "HISTORY" | "COLLECTING" | "CARE";
  author: string;
  publishedAt: string;
  heroImage: string;
}

export interface EmailMessage extends BaseEntity {
  at: string;
  to: string;
  subject: string;
  body: string;
  template: string;
}

export interface AuditEventRow extends BaseEntity {
  at: string;
  actorType: "user" | "system";
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown>;
}

export interface UploadedImage extends BaseEntity {
  uploaderId: string;
  listingId: string | null;
  path: string; // storage-relative
  originalName: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
}
