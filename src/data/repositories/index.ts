/**
 * Typed repository registry — the single DI point for persistence.
 * Services import from here; swapping to Postgres means re-pointing this file
 * (or constructing the alternate set from config), nothing else changes.
 */

import type {
  Article,
  AuditEventRow,
  Brand,
  CartItem,
  Certificate,
  EmailMessage,
  Inspection,
  Listing,
  Notification,
  Offer,
  Order,
  Payout,
  Payment,
  WatchPassport,
  PasswordResetToken,
  PricePoint,
  Review,
  RoleDefinition,
  Session,
  UploadedImage,
  User,
  VaultEntry,
} from "@/domain/entities";
import { JsonCollectionRepository, type Repository } from "./base-repository";
import type { IdPrefix } from "@/core/ids";

export interface Repositories {
  users: Repository<User>;
  sessions: Repository<Session>;
  resetTokens: Repository<PasswordResetToken>;
  roles: Repository<RoleDefinition>;
  brands: Repository<Brand>;
  listings: Repository<Listing>;
  priceHistory: Repository<PricePoint>;
  offers: Repository<Offer>;
  cartItems: Repository<CartItem>;
  vaultEntries: Repository<VaultEntry>;
  orders: Repository<Order>;
  payments: Repository<Payment>;
  payouts: Repository<Payout>;
  inspections: Repository<Inspection>;
  certificates: Repository<Certificate>;
  passports: Repository<WatchPassport>;
  reviews: Repository<Review>;
  notifications: Repository<Notification>;
  articles: Repository<Article>;
  emails: Repository<EmailMessage>;
  auditEvents: Repository<AuditEventRow>;
  uploadedImages: Repository<UploadedImage>;
}

export function createRepositories(): Repositories {
  return {
    users: new JsonCollectionRepository<User>("users", "usr", ["email"]),
    sessions: new JsonCollectionRepository<Session>("sessions", "ses"),
    resetTokens: new JsonCollectionRepository<PasswordResetToken>("reset-tokens", "rt"),
    roles: new JsonCollectionRepository<RoleDefinition>("roles", "prf", ["name"]),
    brands: new JsonCollectionRepository<Brand>("brands", "brd", ["slug"]),
    listings: new JsonCollectionRepository<Listing>("listings", "wat", ["slug"]),
    priceHistory: new JsonCollectionRepository<PricePoint>("price-history", "prf"),
    offers: new JsonCollectionRepository<Offer>("offers", "off"),
    cartItems: new JsonCollectionRepository<CartItem>("cart-items", "car"),
    vaultEntries: new JsonCollectionRepository<VaultEntry>("vault-entries", "vault"),
    orders: new JsonCollectionRepository<Order>("orders", "ord"),
    payments: new JsonCollectionRepository<Payment>("payments", "pay", ["idempotencyKey"]),
    payouts: new JsonCollectionRepository<Payout>("payouts", "pay"),
    inspections: new JsonCollectionRepository<Inspection>("inspections", "cert"),
    certificates: new JsonCollectionRepository<Certificate>("certificates", "cert", [
      "certificateNumber",
    ]),
    passports: new JsonCollectionRepository<WatchPassport>("passports", "passport"),
    reviews: new JsonCollectionRepository<Review>("reviews", "rev", ["orderId"]),
    notifications: new JsonCollectionRepository<Notification>("notifications", "notif"),
    articles: new JsonCollectionRepository<Article>("articles", "art", ["slug"]),
    emails: new JsonCollectionRepository<EmailMessage>("emails", "email"),
    auditEvents: new JsonCollectionRepository<AuditEventRow>("audit-events", "aud"),
    uploadedImages: new JsonCollectionRepository<UploadedImage>("uploaded-images", "img"),
  };
}

/** Process-wide repository singleton (created lazily so tests can use temp dirs). */
let cached: Repositories | undefined;

export function repos(): Repositories {
  if (!cached) cached = createRepositories();
  return cached;
}

/** Test seam: replace the singleton (e.g. pointing at a temp data dir). */
export function setRepositories(next: Repositories | undefined): void {
  cached = next;
}

export type { IdPrefix };
