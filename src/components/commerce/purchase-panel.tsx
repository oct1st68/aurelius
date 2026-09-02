"use client";

import { ShoppingBag } from "lucide-react";
import { buyNowServerAction } from "@/app/(site)/actions/buy-now-action";

interface Props {
  listingId: string;
  slug: string;
  priceLabel: string;
  status: string;
  isOwnListing: boolean;
  isAuthenticated: boolean;
}

/**
 * Sticky provenance column. On mobile it becomes a fixed bottom purchase bar
 * (44px+ touch targets, safe-area aware).
 */
export function PurchasePanel({ listingId, slug, priceLabel, status, isOwnListing, isAuthenticated }: Props) {
  const available = status === "PUBLISHED";

  const buyForm = available && !isOwnListing && (
    <form action={buyNowServerAction} className="mt-5">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="slug" value={`/watches/${slug}`} />
      <button type="submit" className="btn-imperial btn-burgundy w-full" disabled={!isAuthenticated}>
        <ShoppingBag className="h-4 w-4" aria-hidden />
        {isAuthenticated ? "Buy now — secure custody" : "Sign in to purchase"}
      </button>
      {!isAuthenticated && (
        <p className="mt-2 text-center text-xs text-stone">
          You will be asked to sign in first.
        </p>
      )}
    </form>
  );

  const custody = (
    <ul className="space-y-1.5 text-xs leading-relaxed text-ash">
      <li>· Insured courier, escrow-style custody</li>
      <li>· Authentication included before dispatch</li>
      <li>· Digital Watch Passport on completion</li>
    </ul>
  );

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-charcoal/95 px-4 py-3 backdrop-blur md:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        aria-label="Purchase"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg text-ash">{priceLabel}</p>
            <p className="text-[9px] uppercase tracking-[0.11em] text-stone">
              {available ? "Available · insured custody" : status.toLowerCase()}
            </p>
          </div>
          {available && !isOwnListing ? (
            <form action={buyNowServerAction}>
              <input type="hidden" name="listingId" value={listingId} />
              <input type="hidden" name="slug" value={`/watches/${slug}`} />
              <button type="submit" className="btn-imperial btn-burgundy !min-h-11 px-6" disabled={!isAuthenticated}>
                Buy now
              </button>
            </form>
          ) : (
            <span className="badge">{status.toLowerCase()}</span>
          )}
        </div>
      </div>

      {/* Desktop: sticky provenance column */}
      <section
        aria-label="Purchase"
        className="sticky top-24 z-10 mt-8 hidden border-t border-white/15 pt-6 md:block"
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-3xl tracking-wide text-ash">{priceLabel}</p>
          {available ? (
            <span className="badge badge-ok">Available</span>
          ) : (
            <span className="badge badge-bad">{status.toLowerCase()}</span>
          )}
        </div>

        {buyForm}

        {isOwnListing && (
          <p className="mt-4 text-sm text-ash">
            This is your listing — manage it from the{" "}
            <a href="/seller/dashboard" className="text-antique-gold underline underline-offset-4">
              seller dashboard
            </a>
            .
          </p>
        )}

        <div className="mt-6 border-t border-white/10 pt-5">{custody}</div>
      </section>
    </>
  );
}
