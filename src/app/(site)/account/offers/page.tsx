import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { listOffersForBuyer } from "@/lib/services/offer-service";
import { formatMoney } from "@/core/money";
import { BuyerOfferActions } from "@/components/commerce/buyer-offer-actions";
import { formatTimestamp } from "@/lib/services/admin-service";

export const metadata = { title: "Your Offers" };

export default async function BuyerOffersPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/account/offers");
  const views = await listOffersForBuyer(auth.user.id);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Pactiones</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Your Offers</h1>
      <div className="gold-rule mt-6" />

      <div className="mt-8 space-y-4">
        {views.map(({ offer, listing }) => (
          <div key={offer.id} className="panel flex flex-wrap items-center gap-4 p-5">
            {listing.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/media/${listing.images[0].path}`}
                alt={listing.images[0].alt}
                className="h-20 w-16 border border-gold/15 object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-bronze">
                {formatTimestamp(offer.createdAt)}
              </p>
              <Link href={`/watches/${listing.slug}`} className="font-serif-lux block truncate text-lg text-ivory hover:text-gold">
                {listing.model}
              </Link>
              <p className="text-sm text-gold">
                {formatMoney(offer.amount)}
                {offer.parentOfferId && " (counter-offer)"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`badge ${
                  offer.status === "PENDING"
                    ? "badge-warn"
                    : offer.status === "ACCEPTED"
                      ? "badge-ok"
                      : offer.status === "COUNTERED"
                        ? "badge-warn"
                        : "badge-bad"
                }`}
              >
                {offer.status.toLowerCase()}
              </span>
              <BuyerOfferActions offerId={offer.id} status={offer.status} orderId={offer.orderId} />
            </div>
          </div>
        ))}
        {views.length === 0 && (
          <div className="panel p-12 text-center">
            <p className="font-serif-lux text-lg italic text-travertine/70">
              No offers yet — negotiate like a Roman.
            </p>
            <Link href="/watches" className="btn-imperial btn-solid mt-6">
              Browse the catalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
