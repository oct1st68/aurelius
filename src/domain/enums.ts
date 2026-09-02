/**
 * Domain enums & types shared across services. Single source of truth —
 * server and UI both import these; no duplication, no drift.
 */

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export type Role = "USER" | "BUYER" | "SELLER" | "AUTHENTICATOR" | "ADMIN";

export type Permission =
  | "watch:read"
  | "watch:create"
  | "watch:update-own"
  | "watch:moderate"
  | "offer:create"
  | "offer:respond-own"
  | "cart:manage"
  | "order:create"
  | "order:read-own"
  | "order:transition"
  | "payment:create"
  | "payment:refund"
  | "certificate:issue"
  | "certificate:read-full-serial"
  | "passport:create"
  | "review:create"
  | "notification:read-own"
  | "user:manage"
  | "seller:verify"
  | "audit:read"
  | "system:manage";

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  USER: ["watch:read"],
  BUYER: [
    "watch:read",
    "cart:manage",
    "offer:create",
    "order:create",
    "order:read-own",
    "review:create",
    "notification:read-own",
  ],
  SELLER: [
    "watch:read",
    "watch:create",
    "watch:update-own",
    "order:read-own",
    "order:transition",
    "offer:respond-own",
    "notification:read-own",
  ],
  AUTHENTICATOR: [
    "watch:read",
    "order:read-own",
    "certificate:issue",
    "certificate:read-full-serial",
  ],
  ADMIN: [
    "watch:read",
    "watch:moderate",
    "user:manage",
    "seller:verify",
    "payment:refund",
    "certificate:read-full-serial",
    "order:transition",
    "audit:read",
    "system:manage",
    "notification:read-own",
  ],
};

export const ALL_ROLES: readonly Role[] = ["USER", "BUYER", "SELLER", "AUTHENTICATOR", "ADMIN"];

// ---------------------------------------------------------------------------
// Listing lifecycle
// ---------------------------------------------------------------------------

export type ListingStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "RESERVED"
  | "SOLD"
  | "ARCHIVED";

export const LISTING_TRANSITIONS: Record<ListingStatus, readonly ListingStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "ARCHIVED"],
  PENDING_REVIEW: ["CHANGES_REQUESTED", "APPROVED"],
  CHANGES_REQUESTED: ["PENDING_REVIEW", "ARCHIVED"],
  APPROVED: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["RESERVED", "ARCHIVED"],
  RESERVED: ["PUBLISHED", "SOLD"],
  SOLD: [],
  ARCHIVED: [],
};

/** Statuses visible in the public catalog. */
export const PUBLIC_LISTING_STATUSES: readonly ListingStatus[] = ["PUBLISHED"];

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export type OfferStatus =
  | "PENDING"
  | "COUNTERED"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED";

export const TERMINAL_OFFER_STATUSES: readonly OfferStatus[] = [
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
];

// ---------------------------------------------------------------------------
// Orders — centralized state machine
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_SECURED"
  | "SELLER_PREPARING"
  | "SHIPPED_TO_AUTHENTICATOR"
  | "AUTHENTICATING"
  | "AUTHENTICATED"
  | "AUTHENTICATION_FAILED"
  | "SHIPPED_TO_BUYER"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "DISPUTED"
  | "PAYOUT_RELEASED";

/**
 * The single map of legal order transitions. `orderService.transition()` is the
 * only code allowed to change an order status — validated against this map.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PAYMENT_SECURED", "CANCELLED"],
  PAYMENT_SECURED: ["SELLER_PREPARING", "CANCELLED", "REFUND_PENDING"],
  SELLER_PREPARING: ["SHIPPED_TO_AUTHENTICATOR", "CANCELLED", "REFUND_PENDING"],
  SHIPPED_TO_AUTHENTICATOR: ["AUTHENTICATING"],
  AUTHENTICATING: ["AUTHENTICATED", "AUTHENTICATION_FAILED"],
  AUTHENTICATED: ["SHIPPED_TO_BUYER"],
  AUTHENTICATION_FAILED: ["REFUND_PENDING"],
  SHIPPED_TO_BUYER: ["DELIVERED"],
  DELIVERED: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["PAYOUT_RELEASED"],
  CANCELLED: [],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
  DISPUTED: ["REFUND_PENDING"],
  PAYOUT_RELEASED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Escrow-like happy path used by tests and the seed's demo order. */
export const ORDER_HAPPY_PATH: readonly OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAYMENT_SECURED",
  "SELLER_PREPARING",
  "SHIPPED_TO_AUTHENTICATOR",
  "AUTHENTICATING",
  "AUTHENTICATED",
  "SHIPPED_TO_BUYER",
  "DELIVERED",
  "COMPLETED",
  "PAYOUT_RELEASED",
];

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentStatus =
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "SUCCEEDED"
  | "DECLINED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentIntentStatus =
  | "requires_action"
  | "processing"
  | "succeeded"
  | "declined"
  | "canceled";

// ---------------------------------------------------------------------------
// Seller verification
// ---------------------------------------------------------------------------

export type SellerVerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

// ---------------------------------------------------------------------------
// Certificates & inspection
// ---------------------------------------------------------------------------

export type InspectionOutcome = "PENDING" | "APPROVED" | "REJECTED" | "ADDITIONAL_REVIEW";

export type InspectionStatus = "QUEUED" | "IN_PROGRESS" | InspectionOutcome;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | "OFFER_RECEIVED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "OFFER_COUNTERED"
  | "OFFER_EXPIRED"
  | "PRICE_DROP"
  | "PAYMENT_SECURED"
  | "ORDER_UPDATED"
  | "SHIPPED"
  | "DELIVERED"
  | "AUTHENTICATION_PASSED"
  | "AUTHENTICATION_FAILED"
  | "LISTING_MODERATED"
  | "ADMIN_ALERT"
  | "SYSTEM";

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface ReviewStars {
  /** 1..5, integer — validated by zod at the boundary. */
  overall: 1 | 2 | 3 | 4 | 5;
}
