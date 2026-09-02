import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { hasRole, permissionsOf } from "@/lib/auth/rbac";
import { listOrdersForSeller } from "@/lib/services/order-service";
import { listOffersForSeller } from "@/lib/services/offer-service";
import { payoutService } from "@/lib/services/payout-service";
import { repos } from "@/data/repositories";
import { formatMoney } from "@/core/money";
import { OrderStatusBadge } from "@/components/commerce/order-status-badge";
import { BecomeSellerButton } from "@/components/seller/become-seller-button";

export const metadata = { title: "Seller Dashboard" };

/** MERCURY MARKET — seller dashboard home. */
export default async function SellerDashboardPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/seller/dashboard");

  if (!hasRole(auth.user, "SELLER")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="eyebrow">Mercurius · God of Commerce</p>
        <h1 className="font-display mt-2 text-4xl text-ivory">Become a Seller</h1>
        <div className="gold-rule mx-auto mt-6 w-32" />
        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-travertine/70">
          Open your own storefront within the empire: list watches, negotiate
          offers, and ship through the authentication atelier. Upgrade is
          instant on localhost; in production this is where verification
          happens.
        </p>
        <BecomeSellerButton />
      </div>
    );
  }

  const sellerId = auth.user.id;
  const [orders, offerViews, payouts, listings] = await Promise.all([
    listOrdersForSeller(sellerId),
    listOffersForSeller(sellerId),
    payoutService.listForSeller(sellerId),
    repos().listings.findMany((l) => l.sellerId === sellerId),
  ]);
  const can = permissionsOf(auth.user);

  const published = listings.filter((l) => l.status === "PUBLISHED");
  const pending = listings.filter((l) => l.status === "PENDING_REVIEW" || l.status === "CHANGES_REQUESTED");
  const pendingOffers = offerViews.filter((v) => v.offer.status === "PENDING" || v.offer.status === "COUNTERED");
  const revenue = payouts
    .filter((p) => p.status === "RELEASED")
    .reduce((sum, p) => sum + p.amount.amountCents, 0);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Mercurius · God of Commerce</p>
          <h1 className="font-display mt-2 text-4xl text-ivory">Seller Dashboard</h1>
        </div>
        <Link href="/seller/listings/new" className="btn-imperial btn-solid">
          + New Listing
        </Link>
      </div>
      <div className="gold-rule mt-6" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published listings" value={String(published.length)} />
        <Stat label="Awaiting moderation" value={String(pending.length)} />
        <Stat label="Open offers" value={String(pendingOffers.length)} />
        <Stat label="Released payouts" value={formatMoney({ amountCents: revenue, currency: "USD" })} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="dash-offers">
          <div className="flex items-center justify-between">
            <h2 id="dash-offers" className="eyebrow">
              Offers needing response
            </h2>
            <Link href="/seller/offers" className="text-xs text-gold underline underline-offset-4">
              All offers
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {pendingOffers.slice(0, 4).map(({ offer, listing }) => (
              <li key={offer.id} className="panel flex items-center justify-between p-4 text-sm">
                <span className="truncate text-ivory">{listing.model}</span>
                <span className="text-gold">{formatMoney(offer.amount)}</span>
              </li>
            ))}
            {pendingOffers.length === 0 && (
              <li className="panel p-6 text-sm text-travertine/60">No open offers.</li>
            )}
          </ul>
        </section>

        <section aria-labelledby="dash-orders">
          <div className="flex items-center justify-between">
            <h2 id="dash-orders" className="eyebrow">
              Orders to fulfil
            </h2>
            <Link href="/seller/orders" className="text-xs text-gold underline underline-offset-4">
              All orders
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {orders
              .filter((o) => ["PAYMENT_SECURED", "SELLER_PREPARING", "AUTHENTICATED"].includes(o.status))
              .slice(0, 4)
              .map((order) => (
                <li key={order.id} className="panel flex items-center justify-between p-4 text-sm">
                  <Link href={`/seller/orders/${order.id}`} className="truncate text-ivory hover:text-gold">
                    Order {order.id.slice(-8).toUpperCase()}
                  </Link>
                  <OrderStatusBadge status={order.status} />
                </li>
              ))}
            {orders.filter((o) => ["PAYMENT_SECURED", "SELLER_PREPARING", "AUTHENTICATED"].includes(o.status)).length === 0 && (
              <li className="border-t border-white/10 py-6 text-sm text-stone">
                No orders awaiting fulfilment right now.
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="mt-10 flex flex-wrap gap-3" aria-label="Seller tools">
        {can.has("watch:create") && (
          <>
            <Link href="/seller/listings" className="btn-imperial !min-h-10 px-5 text-[11px]">
              Listings & Inventory
            </Link>
            <Link href="/seller/payouts" className="btn-imperial !min-h-10 px-5 text-[11px]">
              Payouts
            </Link>
            <Link href={`/mercury/${sellerId}`} className="btn-imperial !min-h-10 px-5 text-[11px]">
              My Storefront
            </Link>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-6">
      <p className="font-display text-2xl text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ash">{label}</p>
    </div>
  );
}
