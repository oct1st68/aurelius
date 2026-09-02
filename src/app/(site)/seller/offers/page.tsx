import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { hasRole } from "@/lib/auth/rbac";
import { listOffersForSeller } from "@/lib/services/offer-service";
import { formatMoney } from "@/core/money";
import { SellerOfferActions } from "@/components/seller/seller-offer-actions";

export const metadata = { title: "Offers" };

export default async function SellerOffersPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/seller/offers");
  if (!hasRole(auth.user, "SELLER")) redirect("/seller/dashboard");

  const views = await listOffersForSeller(auth.user.id);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Mercury Market · Negotiations</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Incoming Offers</h1>
      <div className="gold-rule mt-6" />

      <div className="mt-8 space-y-4">
        {views.map(({ offer, listing }) => (
          <div key={offer.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-bronze">
                  {new Date(offer.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  {offer.parentOfferId && " · counter"}
                </p>
                <p className="font-serif-lux mt-1 text-lg text-ivory">{listing.model}</p>
                <p className="text-sm text-gold">
                  {formatMoney(offer.amount)}{" "}
                  <span className="text-xs text-travertine/50">
                    (asking {formatMoney(listing.price)})
                  </span>
                </p>
                {offer.message && (
                  <p className="mt-2 border-l-2 border-gold/40 pl-3 text-sm italic text-travertine/70">
                    “{offer.message}”
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`badge ${
                    offer.status === "PENDING"
                      ? "badge-warn"
                      : offer.status === "ACCEPTED"
                        ? "badge-ok"
                        : "badge-bad"
                  }`}
                >
                  {offer.status.toLowerCase()}
                </span>
                <span className="text-xs text-bronze">
                  {offer.status === "PENDING"
                    ? `Expires ${new Date(offer.expiresAt).toLocaleDateString("en-US")}`
                    : ""}
                </span>
              </div>
            </div>
            {offer.status === "PENDING" && (
              <SellerOfferActions offerId={offer.id} askingCents={listing.price.amountCents} />
            )}
          </div>
        ))}
        {views.length === 0 && (
          <div className="panel p-12 text-center text-sm text-travertine/60">
            No offers yet. The empire moves slowly, then all at once.
          </div>
        )}
      </div>
    </div>
  );
}
