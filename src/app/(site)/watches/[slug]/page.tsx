import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getListingBySlug, getBrandById, getPriceHistory } from "@/lib/services/listing-service";
import { listReviewsForListing } from "@/lib/services/review-service";
import { formatMoney } from "@/core/money";
import { getSession } from "@/lib/auth/request-context";
import { hasPermission } from "@/lib/auth/rbac";
import { Gallery } from "@/components/commerce/gallery";
import { PurchasePanel } from "@/components/commerce/purchase-panel";
import { OfferForm } from "@/components/commerce/offer-form";
import { RecentlyViewedTracker, RecentlyViewedRail } from "@/components/commerce/recently-viewed-tracker";
import { VaultSectionClient } from "@/components/commerce/vault-section-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const listing = await getListingBySlug(slug);
    return { title: `${listing.model} — Ref. ${listing.referenceNumber}` };
  } catch {
    return { title: "Watch not found" };
  }
}

export default async function WatchDetailPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug).catch(() => null);
  if (!listing) notFound();

  const [brand, priceHistory, reviews, auth] = await Promise.all([
    getBrandById(listing.brandId),
    getPriceHistory(listing.id),
    listReviewsForListing(listing.id),
    getSession(),
  ]);
  const seller = await (await import("@/data/repositories")).repos().users.find(
    (u) => u.id === listing.sellerId,
  );
  const isOwnListing = auth?.user.id === listing.sellerId;
  const canOffer =
    !!auth &&
    listing.status === "PUBLISHED" &&
    !isOwnListing &&
    hasPermission(auth, "offer:create");
  void auth; // `auth` is SessionWithUser; canOffer already validated permissions

  const specRows: [string, string][] = [
    ["Movement", listing.movement],
    ["Case material", listing.caseMaterial],
    ["Case diameter", `${listing.caseDiameterMm} mm`],
    ["Dial", listing.dialColor],
    ["Bracelet / strap", listing.bracelet],
    ["Water resistance", listing.waterResistanceM > 0 ? `${listing.waterResistanceM} m` : "—"],
    ["Functions", listing.functions.join(", ") || "—"],
    ["Power reserve", listing.powerReserveHours ? `${listing.powerReserveHours} h` : "—"],
    ["Condition", listing.conditionGrade],
    ["Box & papers", listing.boxAndPapers.replace(/_/g, " ").toLowerCase()],
    ["Service history", listing.serviceHistory],
  ];

  return (
    <div className="museum-page pb-32 md:pb-0">
      <RecentlyViewedTracker
        watch={{
          id: listing.id,
          slug: listing.slug,
          model: listing.model,
          brand: brand.name,
          price: formatMoney(listing.price),
          image: listing.images[0]?.path ?? "",
        }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-stone">
        <Link href="/watches" className="hover:text-antique-gold">
          Catalog
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <Link href={`/houses/${brand.slug}`} className="hover:text-antique-gold">
          {brand.name}
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-ash">{listing.model}</span>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Gallery
            images={listing.images.map((img) => ({ src: `/media/${img.path}`, alt: img.alt }))}
          />
        </div>

        <div className="lg:col-span-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ash">{brand.name}</p>
          <h1 className="mt-3 font-serif-lux text-5xl leading-[0.98] text-ink sm:text-6xl">{listing.model}</h1>
          <p className="mt-3 text-sm text-ash">
            Ref. {listing.referenceNumber} · {listing.year} · {listing.conditionGrade}
          </p>
          <div className="paper-rule mt-7" />

          <PurchasePanel
            listingId={listing.id}
            slug={listing.slug}
            priceLabel={formatMoney(listing.price)}
            status={listing.status}
            isOwnListing={!!isOwnListing}
            isAuthenticated={!!auth}
          />

          {/* Offer panel */}
          {listing.status === "PUBLISHED" && !isOwnListing && (
            <section aria-labelledby="offer-heading" className="mt-8 border-t border-white/15 pt-6">
              <h2 id="offer-heading" className="eyebrow">
                Make an offer
              </h2>
              {canOffer ? (
                <OfferForm listingId={listing.id} currency={listing.price.currency} askingCents={listing.price.amountCents} />
              ) : (
                <p className="mt-4 text-sm text-ash">
                  <Link href="/login" className="text-antique-gold underline underline-offset-4">
                    Sign in
                  </Link>{" "}
                  with a buyer account to negotiate like a Roman.
                </p>
              )}
            </section>
          )}

          {/* Vault */}
          <div className="mt-6">
            <VaultSection listingId={listing.id} isAuthenticated={!!auth} />
          </div>

          {/* Description */}
          <section aria-labelledby="desc-heading" className="mt-10 border-t border-white/10 pt-8">
            <h2 id="desc-heading" className="eyebrow">
              Connoisseur&rsquo;s Notes
            </h2>
            <p className="font-serif-lux mt-4 whitespace-pre-line text-xl leading-relaxed text-bone/85">
              {listing.description}
            </p>
          </section>
        </div>
      </div>

      {/* Specifications — museum label block */}
      <section aria-labelledby="spec-heading" className="mt-20 max-w-4xl">
        <h2 id="spec-heading" className="eyebrow">
          Specifications
        </h2>
        <dl className="reveal-stagger mt-6 grid gap-x-14 border-t border-white/10 sm:grid-cols-2">
          {specRows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6 border-b border-white/10 py-4">
              <dt className="text-[11px] uppercase tracking-[0.12em] text-stone">{label}</dt>
              <dd className="text-right text-sm font-medium text-bone">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Price history */}
      {priceHistory.length > 1 && (
        <section aria-labelledby="ph-heading" className="mt-14 max-w-4xl">
          <h2 id="ph-heading" className="eyebrow">
            Price History
          </h2>
          <ul className="mt-4 border-t border-white/10">
            {priceHistory.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-white/10 py-3 text-sm">
                <span className="text-ash">
                  {new Date(p.at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </span>
                <span className={p.kind === "PRICE_DROP" ? "font-medium text-forest" : "text-ash"}>
                  {formatMoney({ amountCents: p.priceCents, currency: p.currency })}
                  {p.kind === "PRICE_DROP" && " ↓"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reviews */}
      <section aria-labelledby="rev-heading" className="mt-14 max-w-4xl">
        <h2 id="rev-heading" className="eyebrow">
          Buyer Chronicle ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-ash">No reviews yet for this piece.</p>
        ) : (
          <div className="mt-6 space-y-5">
            {reviews.map((review) => (
              <article key={review.id} className="border-t border-white/10 pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ash" aria-label={`${review.rating} out of 5 stars`}>
                    {"★".repeat(review.rating)}
                    <span className="text-white/25">{"★".repeat(5 - review.rating)}</span>
                  </p>
                  <time className="text-xs text-stone" dateTime={review.createdAt}>
                    {new Date(review.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </time>
                </div>
                <h3 className="font-serif-lux mt-2 text-2xl text-bone">{review.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ash">{review.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Seller */}
      {seller && (
        <section aria-labelledby="seller-heading" className="mt-14 flex max-w-4xl flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-8 pb-24 md:pb-0">
          <div>
            <h2 id="seller-heading" className="eyebrow">
              Offered by
            </h2>
            <p className="mt-1.5 text-xl text-bone">{seller.displayName}</p>
          </div>
          <Link href={`/mercury/${seller.id}`} className="btn-imperial">
            Visit storefront
          </Link>
        </section>
      )}

      <RecentlyViewedRail />
    </div>
  );
}

function VaultSection({ listingId, isAuthenticated }: { listingId: string; isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <p className="text-sm text-travertine/55">
        <Link href="/login" className="text-gold underline underline-offset-4">
          Sign in
        </Link>{" "}
        to store this piece in your Vault.
      </p>
    );
  }
  return <VaultSectionClient listingId={listingId} />;
}
