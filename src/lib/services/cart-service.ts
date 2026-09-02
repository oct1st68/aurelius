/**
 * Server-side cart & vault. Every watch listing has quantity = 1, so the cart
 * is a set of (userId, listingId) pairs — duplicates are prevented explicitly.
 */

import { ConflictError, ForbiddenError, NotFoundError } from "@/core/errors";
import { nowIso } from "@/core/time";
import type { CartItem, Listing, VaultEntry } from "@/domain/entities";
import { repos } from "@/data/repositories";
import type { SessionWithUser } from "@/lib/auth/rbac";
import { assertPurchasable } from "./listing-service";

export interface CartLine {
  item: CartItem;
  listing: Listing;
}

export async function addToCart(auth: SessionWithUser, listingId: string): Promise<void> {
  const listing = await repos().listings.find((l) => l.id === listingId);
  if (!listing) throw new NotFoundError("Listing not found");
  if (listing.sellerId === auth.user.id) {
    throw new ConflictError("You cannot add your own listing to the cart.");
  }
  assertPurchasable(listing);
  const existing = await repos().cartItems.find(
    (c) => c.userId === auth.user.id && c.listingId === listingId,
  );
  if (existing) return; // idempotent add
  await repos().cartItems.create({
    userId: auth.user.id,
    listingId,
    addedAt: nowIso(),
  });
}

export async function removeFromCart(auth: SessionWithUser, listingId: string): Promise<void> {
  const item = await repos().cartItems.find(
    (c) => c.userId === auth.user.id && c.listingId === listingId,
  );
  if (!item) throw new NotFoundError("Not in cart");
  await repos().cartItems.delete(item.id);
}

export async function getCart(userId: string): Promise<CartLine[]> {
  const items = await repos().cartItems.findMany((c) => c.userId === userId);
  const lines: CartLine[] = [];
  for (const item of items) {
    const listing = await repos().listings.find((l) => l.id === item.listingId);
    if (listing) lines.push({ item, listing });
  }
  // Drop lines whose listing is no longer purchasable (sold/reserved elsewhere).
  const available = lines.filter((line) => line.listing.status === "PUBLISHED");
  return available.sort((a, b) => a.item.addedAt.localeCompare(b.item.addedAt));
}

export async function clearCart(userId: string, keepListingIds?: Set<string>): Promise<void> {
  const items = await repos().cartItems.findMany((c) => c.userId === userId);
  for (const item of items) {
    if (!keepListingIds || !keepListingIds.has(item.listingId)) {
      await repos().cartItems.delete(item.id);
    }
  }
}

// ---------------------------------------------------------------------------
// The Vault — server-side saved collection
// ---------------------------------------------------------------------------

export async function saveToVault(auth: SessionWithUser, listingId: string, note?: string): Promise<void> {
  const listing = await repos().listings.find((l) => l.id === listingId);
  if (!listing) throw new NotFoundError("Listing not found");
  const existing = await repos().vaultEntries.find(
    (v) => v.userId === auth.user.id && v.listingId === listingId,
  );
  if (existing) {
    if (note !== undefined) {
      await repos().vaultEntries.update(existing.id, { note });
    }
    return;
  }
  await repos().vaultEntries.create({
    userId: auth.user.id,
    listingId,
    note: note ?? null,
    addedAt: nowIso(),
  });
}

export async function removeFromVault(auth: SessionWithUser, listingId: string): Promise<void> {
  const entry = await repos().vaultEntries.find(
    (v) => v.userId === auth.user.id && v.listingId === listingId,
  );
  if (!entry) throw new NotFoundError("Not in your Vault");
  await repos().vaultEntries.delete(entry.id);
}

export async function getVault(userId: string): Promise<{ entry: VaultEntry; listing: Listing }[]> {
  const entries = await repos().vaultEntries.findMany((v) => v.userId === userId);
  const out: { entry: VaultEntry; listing: Listing }[] = [];
  for (const entry of entries) {
    const listing = await repos().listings.find((l) => l.id === entry.listingId);
    if (listing) out.push({ entry, listing });
  }
  return out.sort((a, b) => b.entry.addedAt.localeCompare(a.entry.addedAt));
}

export async function assertVaultOwner(auth: SessionWithUser, entry: VaultEntry): Promise<void> {
  if (entry.userId !== auth.user.id) {
    throw new ForbiddenError("This Vault entry is not yours.");
  }
}
