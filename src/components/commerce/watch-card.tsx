import Link from "next/link";
import type { Listing } from "@/domain/entities";
import { formatMoney } from "@/core/money";
import { getBrandById } from "@/lib/services/listing-service";
import { VaultButton, CartButtons } from "./listing-action-buttons";
import { TiltCard } from "@/components/motion/tilt-card";

/** Auction-catalog lot card. Product stays dominant; actions appear contextually. */
export async function WatchCard({ listing }: { listing: Listing }) {
  const brand = await getBrandById(listing.brandId);
  const image = listing.images[0];
  const href = `/watches/${listing.slug}`;

  return (
    <article className="lot-card group flex min-w-0 flex-col">
      <TiltCard className="group">
        <Link href={href} className="lot-image block aspect-[4/5]" aria-label={`View ${brand.name} ${listing.model}`}>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/${image.path}`} alt={image.alt} loading="lazy" className="h-full w-full object-cover" />
          )}
          <div className="absolute left-4 top-4 flex gap-2">
          {listing.collections.includes("SATURN") && (
            <span className="bg-charcoal/90 px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-ash backdrop-blur-sm">
              Saturn
            </span>
          )}
          {listing.status !== "PUBLISHED" && (
            <span className="bg-oxblood px-2.5 py-1.5 text-[9px] uppercase tracking-[0.1em] text-ivory">
              {listing.status.toLowerCase()}
            </span>
          )}
        </div>
        </Link>
      </TiltCard>

      <div className="flex flex-1 flex-col border-t border-white/10 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ash">{brand.name}</p>
        <Link href={href}>
          <h3 className="mt-1.5 font-serif-lux text-[1.65rem] leading-none text-ink transition-colors group-hover:text-antique-gold">
            {listing.model}
          </h3>
        </Link>
        <p className="mt-2 text-[13px] leading-relaxed text-ash">
          Ref. {listing.referenceNumber} · {listing.year} · {listing.conditionGrade.replace(/_/g, " ").toLowerCase()}
        </p>
        <div className="mt-auto flex min-h-14 items-end justify-between gap-4 pt-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.11em] text-stone">Asking price</p>
            <p className="mt-1 font-display text-[15px] tracking-wide text-ash">{formatMoney(listing.price)}</p>
          </div>
          <div className="lot-actions flex items-center gap-1.5">
            <CartButtons listingId={listing.id} slug={listing.slug} />
            <VaultButton listingId={listing.id} />
          </div>
        </div>
      </div>
    </article>
  );
}
