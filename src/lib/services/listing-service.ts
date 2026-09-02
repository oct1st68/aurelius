/**
 * Listing service — the seller-side lifecycle plus the public catalog query API.
 * State transitions enforced server-side via LISTING_TRANSITIONS.
 * Sellers can never approve their own listings (moderation is admin-only).
 */

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/core/errors";
import { generateId } from "@/core/ids";
import { money, type CurrencyCode } from "@/core/money";
import { nowIso } from "@/core/time";
import type {
  Brand,
  Listing,
  PricePoint,
  WatchImage,
} from "@/domain/entities";
import { LISTING_TRANSITIONS, type ListingStatus, type Permission } from "@/domain/enums";
import { repos } from "@/data/repositories";
import { hasRole, isAdmin, type SessionWithUser } from "@/lib/auth/rbac";
import { audit } from "./audit-service";
import { notify } from "./notification-service";

export interface CatalogQuery {
  q?: string;
  brand?: string;
  status?: ListingStatus;
  minPriceCents?: number;
  maxPriceCents?: number;
  collections?: string[];
  movement?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "year_asc" | "year_desc";
  page?: number;
  perPage?: number;
  sellerId?: string;
}

export interface CatalogPage {
  items: Listing[];
  brands: Brand[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function listBrands(): Promise<Brand[]> {
  return (await repos().brands.list()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBrandBySlug(slug: string): Promise<Brand> {
  const brand = await repos().brands.find((b) => b.slug === slug);
  if (!brand) throw new NotFoundError("Brand not found");
  return brand;
}

const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 48;

export async function queryCatalog(query: CatalogQuery): Promise<CatalogPage> {
  const perPage = Math.min(Math.max(query.perPage ?? DEFAULT_PER_PAGE, 1), MAX_PER_PAGE);
  const page = Math.max(query.page ?? 1, 1);
  const all = await repos().listings.list();
  const term = query.q?.trim().toLowerCase();

  let items = all.filter((l) => {
    if (query.sellerId && l.sellerId !== query.sellerId) return false;
    if (!query.sellerId && l.status !== "PUBLISHED") return false;
    if (query.status && l.status !== query.status) return false;
    if (query.brand && l.brandId !== query.brand) return false;
    if (query.minPriceCents !== undefined && l.price.amountCents < query.minPriceCents) return false;
    if (query.maxPriceCents !== undefined && l.price.amountCents > query.maxPriceCents) return false;
    if (query.movement && l.movement !== query.movement) return false;
    if (query.collections?.length) {
      const has = query.collections.some((c) =>
        l.collections.includes(c as Listing["collections"][number]),
      );
      if (!has) return false;
    }
    if (term) {
      const haystack = `${l.model} ${l.referenceNumber} ${l.description} ${l.dialColor} ${l.caseMaterial}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  items = sortListings(items, query.sort ?? "newest");

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const paged = items.slice(start, start + perPage);

  const brands = await listBrands();
  return { items: paged, brands, total, page: safePage, perPage, totalPages };
}

function sortListings(items: Listing[], sort: NonNullable<CatalogQuery["sort"]>): Listing[] {
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => a.price.amountCents - b.price.amountCents);
    case "price_desc":
      return copy.sort((a, b) => b.price.amountCents - a.price.amountCents);
    case "year_asc":
      return copy.sort((a, b) => a.year - b.year);
    case "year_desc":
      return copy.sort((a, b) => b.year - a.year);
    case "newest":
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function getListingBySlug(slug: string): Promise<Listing> {
  const listing = await repos().listings.find((l) => l.slug === slug);
  if (!listing) throw new NotFoundError("Watch not found");
  return listing;
}

export async function getListingById(id: string): Promise<Listing> {
  const listing = await repos().listings.find((l) => l.id === id);
  if (!listing) throw new NotFoundError("Watch not found");
  return listing;
}

export async function getBrandById(id: string): Promise<Brand> {
  const brand = await repos().brands.find((b) => b.id === id);
  if (!brand) throw new NotFoundError("Brand not found");
  return brand;
}

export interface UpsertListingInput {
  sellerId: string;
  brandId: string;
  model: string;
  referenceNumber: string;
  year: number;
  movement: Listing["movement"];
  caseMaterial: string;
  caseDiameterMm: number;
  dialColor: string;
  bracelet: string;
  waterResistanceM: number;
  functions: string[];
  powerReserveHours: number | null;
  conditionGrade: Listing["conditionGrade"];
  conditionNotes: string;
  boxAndPapers: Listing["boxAndPapers"];
  documentation: string[];
  serviceHistory: string;
  images: WatchImage[];
  priceCents: number;
  currency: CurrencyCode;
  collections: Listing["collections"];
  serialNumber: string;
  description: string;
  /** Wizard draft support: DRAFT saves without validation of completeness. */
  isDraft?: boolean;
}

export function validateListingInput(input: UpsertListingInput, requireComplete: boolean): void {
  const problems: Record<string, string> = {};
  if (input.model.trim().length < 2) problems.model = "Model name is required.";
  if (!/^[A-Z0-9-]{3,32}$/i.test(input.referenceNumber)) {
    problems.referenceNumber = "Reference must be 3–32 letters/digits/dashes.";
  }
  const year = input.year;
  if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear() + 1) {
    problems.year = "Enter a valid year.";
  }
  if (requireComplete) {
    if (input.caseDiameterMm < 20 || input.caseDiameterMm > 60) {
      problems.caseDiameterMm = "Diameter must be 20–60mm.";
    }
    if (input.priceCents < 10_000) problems.priceCents = "Price must be at least $100.";
    if (input.images.length === 0) problems.images = "At least one photo is required.";
    if (input.serialNumber.trim().length < 4) {
      problems.serialNumber = "Serial number is required (min 4 characters).";
    }
    if (input.description.trim().length < 40) {
      problems.description = "Description must be at least 40 characters.";
    }
  }
  if (Object.keys(problems).length > 0) {
    throw new ValidationError("Please fix the highlighted fields.", problems);
  }
}

function slugify(model: string, reference: string): string {
  const base = `${model}-${reference}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${generateId("wat").slice(4, 9)}`;
}

export async function createListing(
  auth: SessionWithUser,
  input: UpsertListingInput,
): Promise<Listing> {
  if (!hasRole(auth.user, "SELLER")) {
    throw new ForbiddenError("Only sellers can create listings.");
  }
  validateListingInput(input, !input.isDraft);
  const brand = await repos().brands.find((b) => b.id === input.brandId);
  if (!brand) throw new ValidationError("Unknown brand.");
  const price = money(input.priceCents, input.currency);
  const status: ListingStatus = input.isDraft ? "DRAFT" : "PENDING_REVIEW";
  const listing = await repos().listings.create({
    slug: slugify(input.model, input.referenceNumber),
    sellerId: auth.user.id,
    brandId: input.brandId,
    model: input.model.trim(),
    referenceNumber: input.referenceNumber.trim().toUpperCase(),
    year: input.year,
    movement: input.movement,
    caseMaterial: input.caseMaterial.trim(),
    caseDiameterMm: input.caseDiameterMm,
    dialColor: input.dialColor.trim(),
    bracelet: input.bracelet.trim(),
    waterResistanceM: input.waterResistanceM,
    functions: input.functions,
    powerReserveHours: input.powerReserveHours,
    conditionGrade: input.conditionGrade,
    conditionNotes: input.conditionNotes.trim(),
    boxAndPapers: input.boxAndPapers,
    documentation: input.documentation,
    serviceHistory: input.serviceHistory.trim(),
    images: input.images,
    price,
    collections: input.collections,
    serialNumber: input.serialNumber.trim().toUpperCase(),
    status,
    moderationNote: null,
    description: input.description.trim(),
  });
  if (!input.isDraft) {
    await notify({
      userId: auth.user.id,
      type: "LISTING_MODERATED",
      title: "Listing submitted",
      body: `“${listing.model}” was submitted for review.`,
      link: `/seller/listings/${listing.id}`,
      dedupeKey: `listing-submitted:${listing.id}`,
    });
  }
  await audit({
    actorType: "user",
    actorId: auth.user.id,
    action: input.isDraft ? "listing.draft_created" : "listing.submitted",
    targetType: "listing",
    targetId: listing.id,
  });
  return listing;
}

export async function updateListingDraft(
  auth: SessionWithUser,
  listingId: string,
  patch: Partial<UpsertListingInput>,
): Promise<Listing> {
  const listing = await repos().listings.find((l) => l.id === listingId);
  if (!listing) throw new NotFoundError("Listing not found");
  if (listing.sellerId !== auth.user.id && !isAdmin(auth.user)) {
    throw new ForbiddenError("You do not own this listing.");
  }
  const merged: UpsertListingInput = {
    sellerId: listing.sellerId,
    brandId: patch.brandId ?? listing.brandId,
    model: patch.model ?? listing.model,
    referenceNumber: patch.referenceNumber ?? listing.referenceNumber,
    year: patch.year ?? listing.year,
    movement: patch.movement ?? listing.movement,
    caseMaterial: patch.caseMaterial ?? listing.caseMaterial,
    caseDiameterMm: patch.caseDiameterMm ?? listing.caseDiameterMm,
    dialColor: patch.dialColor ?? listing.dialColor,
    bracelet: patch.bracelet ?? listing.bracelet,
    waterResistanceM: patch.waterResistanceM ?? listing.waterResistanceM,
    functions: patch.functions ?? listing.functions,
    powerReserveHours: patch.powerReserveHours ?? listing.powerReserveHours,
    conditionGrade: patch.conditionGrade ?? listing.conditionGrade,
    conditionNotes: patch.conditionNotes ?? listing.conditionNotes,
    boxAndPapers: patch.boxAndPapers ?? listing.boxAndPapers,
    documentation: patch.documentation ?? listing.documentation,
    serviceHistory: patch.serviceHistory ?? listing.serviceHistory,
    images: patch.images ?? listing.images,
    priceCents: patch.priceCents ?? listing.price.amountCents,
    currency: patch.currency ?? listing.price.currency,
    collections: patch.collections ?? listing.collections,
    serialNumber: patch.serialNumber ?? listing.serialNumber,
    description: patch.description ?? listing.description,
  };
  validateListingInput(merged, !merged.isDraft);
  const updated = await repos().listings.update(listingId, {
    model: merged.model.trim(),
    referenceNumber: merged.referenceNumber.trim().toUpperCase(),
    year: merged.year,
    movement: merged.movement,
    caseMaterial: merged.caseMaterial.trim(),
    caseDiameterMm: merged.caseDiameterMm,
    dialColor: merged.dialColor.trim(),
    bracelet: merged.bracelet.trim(),
    waterResistanceM: merged.waterResistanceM,
    functions: merged.functions,
    powerReserveHours: merged.powerReserveHours,
    conditionGrade: merged.conditionGrade,
    conditionNotes: merged.conditionNotes.trim(),
    boxAndPapers: merged.boxAndPapers,
    documentation: merged.documentation,
    serviceHistory: merged.serviceHistory.trim(),
    images: merged.images,
    price: money(merged.priceCents, merged.currency),
    collections: merged.collections,
    serialNumber: merged.serialNumber.trim().toUpperCase(),
    description: merged.description.trim(),
  });
  return updated;
}

/**
 * Listing status transitions.
 *  - seller: DRAFT→PENDING_REVIEW, CHANGES_REQUESTED→PENDING_REVIEW, ARCHIVED
 *  - admin (moderation): PENDING_REVIEW→APPROVED/CHANGES_REQUESTED, APPROVED→PUBLISHED
 *  - system: RESERVED/SOLD handled by offer/checkout services only
 */
export async function transitionListing(
  listingId: string,
  to: ListingStatus,
  opts: {
    actorId: string | null;
    actorType?: "user" | "system";
    actorIsAdmin?: boolean;
    actorIsSeller?: boolean;
    note?: string;
  },
): Promise<Listing> {
  const updated = await repos().listings.mutate(listingId, (listing) => {
    const allowed = LISTING_TRANSITIONS[listing.status];
    if (!allowed.includes(to)) {
      throw new ConflictError(`Cannot move listing from ${listing.status} to ${to}`);
    }
    const isSystem = opts.actorType === "system";
    const moderationTargets: ListingStatus[] = ["APPROVED", "CHANGES_REQUESTED"];
    if (!isSystem) {
      const isOwner = listing.sellerId === opts.actorId;
      if (!isOwner && !opts.actorIsAdmin) throw new ForbiddenError("Not your listing");
      if (moderationTargets.includes(to) || (to === "PUBLISHED" && listing.status === "APPROVED")) {
        if (!opts.actorIsAdmin) {
          throw new ForbiddenError("Only moderators can approve or publish listings");
        }
      }
    }
    return {
      ...listing,
      status: to,
      moderationNote: opts.note ?? listing.moderationNote,
      updatedAt: nowIso(),
    };
  });
  await audit({
    actorType: opts.actorType ?? "user",
    actorId: opts.actorId,
    action: `listing.${to.toLowerCase()}`,
    targetType: "listing",
    targetId: listingId,
    meta: opts.note ? { note: opts.note } : undefined,
  });
  return updated;
}

/** Seller marks price change — records price history + notifies vault savers. */
export async function changePrice(
  auth: SessionWithUser,
  listingId: string,
  newPriceCents: number,
  currency: CurrencyCode,
): Promise<Listing> {
  const listing = await repos().listings.find((l) => l.id === listingId);
  if (!listing) throw new NotFoundError("Listing not found");
  if (listing.sellerId !== auth.user.id) throw new ForbiddenError("Not your listing");
  if (listing.status !== "PUBLISHED" && listing.status !== "DRAFT" && listing.status !== "APPROVED") {
    throw new ConflictError("Price can only change while the listing is editable");
  }
  const next = money(newPriceCents, currency);
  if (next.amountCents === listing.price.amountCents) return listing;
  const updated = await repos().listings.update(listingId, { price: next });
  const kind: PricePoint["kind"] =
    next.amountCents < listing.price.amountCents ? "PRICE_DROP" : "PRICE_RAISE";
  await repos().priceHistory.create({
    listingId,
    at: nowIso(),
    priceCents: next.amountCents,
    currency: next.currency,
    kind,
  });
  if (kind === "PRICE_DROP" && listing.status === "PUBLISHED") {
    const savers = await repos().vaultEntries.findMany((v) => v.listingId === listingId);
    for (const saver of savers) {
      await notify({
        userId: saver.userId,
        type: "PRICE_DROP",
        title: "Price drop on a vaulted watch",
        body: `“${listing.model}” dropped to ${Math.round(next.amountCents / 100).toLocaleString("en-US")} ${next.currency}.`,
        link: `/watches/${listing.slug}`,
        dedupeKey: `price-drop:${listingId}:${next.amountCents}`,
      });
    }
  }
  return updated;
}

export async function getPriceHistory(listingId: string): Promise<PricePoint[]> {
  const rows = await repos().priceHistory.findMany((p) => p.listingId === listingId);
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

/** Guard used by cart/checkout/offer services. */
export function assertPurchasable(listing: Listing): void {
  if (listing.status !== "PUBLISHED") {
    throw new ConflictError("This watch is no longer available.");
  }
}

export function canViewManagement(auth: SessionWithUser, listing: Listing): boolean {
  return isAdmin(auth.user) || listing.sellerId === auth.user.id;
}

export function sellerOwns(auth: SessionWithUser, listing: Listing): boolean {
  return listing.sellerId === auth.user.id;
}

export const MODERATION_PERMISSION: Permission = "watch:moderate";
