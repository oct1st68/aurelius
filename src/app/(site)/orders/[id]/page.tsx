import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { getOrderForUser } from "@/lib/services/order-service";
import { getListingById, getBrandById } from "@/lib/services/listing-service";
import { getPaymentForOrder } from "@/lib/services/checkout-service";
import { hasReviewForOrder } from "@/lib/services/review-service";
import { getPassportForOrder } from "@/lib/services/passport-service";
import { formatMoney } from "@/core/money";
import { hasRole, isAdmin } from "@/lib/auth/rbac";
import { OrderStatusBadge } from "@/components/commerce/order-status-badge";
import { OrderActions } from "@/components/commerce/order-actions";
import { ReviewForm } from "@/components/commerce/review-form";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const auth = await getSession();
  if (!auth) redirect(`/login?redirectTo=/orders/${id}`);

  const order = await getOrderForUser(id, auth).catch(() => null);
  if (!order) notFound();

  const [listing, payment, reviewed, passport] = await Promise.all([
    getListingById(order.listingId),
    getPaymentForOrder(order.id),
    hasReviewForOrder(order.id),
    getPassportForOrder(order.id),
  ]);
  const brand = await getBrandById(listing.brandId);
  const isBuyer = order.buyerId === auth.user.id;
  const isSeller = order.sellerId === auth.user.id;
  const isAuthenticator = hasRole(auth.user, "AUTHENTICATOR");
  const admin = isAdmin(auth.user);
  const paymentSecured = order.status !== "PENDING_PAYMENT";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-xs text-bronze">
        <Link href="/account/orders" className="hover:text-gold">
          Orders
        </Link>
        <span className="mx-2">/</span>
        <span className="text-travertine/70">{order.id.slice(-8).toUpperCase()}</span>
      </nav>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="font-display mt-1 text-3xl text-ivory">
            {brand.name} {listing.model}
          </h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="gold-rule mt-6" />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {/* Timeline */}
          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="eyebrow">
              Custody Timeline
            </h2>
            <ol className="mt-6 space-y-0">
              {order.timeline.map((event, i) => (
                <li key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {i < order.timeline.length - 1 && (
                    <span aria-hidden className="absolute left-[7px] top-4 h-full w-px bg-gold/25" />
                  )}
                  <span
                    aria-hidden
                    className={`mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border ${
                      i === order.timeline.length - 1
                        ? "border-gold bg-gold"
                        : "border-gold/50 bg-obsidian"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-ivory">{event.note}</p>
                    <p className="mt-0.5 text-xs text-bronze">
                      {new Date(event.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      {" · "}
                      {event.to.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Actions */}
          <OrderActions
            orderId={order.id}
            status={order.status}
            isBuyer={isBuyer}
            isSeller={isSeller}
            isAdmin={admin}
            isAuthenticator={isAuthenticator}
          />

          {/* Review */}
          {isBuyer && (order.status === "COMPLETED" || order.status === "PAYOUT_RELEASED") && (
            <section aria-labelledby="review-heading" className="mt-10">
              <h2 id="review-heading" className="eyebrow">
                Your Chronicle
              </h2>
              {reviewed ? (
                <p className="mt-4 text-sm text-travertine/60">
                  You have already reviewed this order — the empire thanks you.
                </p>
              ) : (
                <ReviewForm orderId={order.id} />
              )}
            </section>
          )}
        </div>

        {/* Summary sidebar */}
        <aside className="space-y-6">
          <section className="panel p-6" aria-label="Order summary">
            <h2 className="font-display text-sm tracking-[0.25em] text-gold">SUMMARY</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Item" value={formatMoney(order.itemPrice)} />
              <Row label="Shipping" value={formatMoney(order.shippingCost)} />
              <Row label="Insurance" value={formatMoney(order.insuranceCost)} />
              <div className="gold-rule my-3" />
              <Row label="Total" value={formatMoney(order.total)} strong />
              {paymentSecured && (
                <Row
                  label="Payment"
                  value={payment ? `${payment.provider} · ${payment.status.toLowerCase()}` : "—"}
                />
              )}
            </dl>
            {order.trackingNumber && (
              <p className="mt-4 text-xs text-bronze">Tracking: {order.trackingNumber}</p>
            )}
          </section>

          {order.shippingAddress.fullName && (
            <section className="panel p-6" aria-label="Shipping address">
              <h2 className="font-display text-sm tracking-[0.25em] text-gold">SHIP TO</h2>
              <address className="mt-3 text-sm not-italic leading-relaxed text-travertine/80">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && (
                  <>
                    <br />
                    {order.shippingAddress.line2}
                  </>
                )}
                <br />
                {order.shippingAddress.city} {order.shippingAddress.postalCode}
                <br />
                {order.shippingAddress.country}
              </address>
            </section>
          )}

          {order.certificateId && (
            <Link href={`/certificate/${(await getCertificateNumber(order.certificateId)) ?? ""}`} className="panel panel-hover block p-5 text-center">
              <p className="eyebrow">AURELIUS Certified</p>
              <p className="mt-1 text-sm text-gold">View authenticity certificate →</p>
            </Link>
          )}

          {passport && (
            <Link href={`/passport/${passport.id}`} className="panel panel-hover block p-5 text-center">
              <p className="eyebrow">Digital Watch Passport</p>
              <p className="mt-1 text-sm text-gold">Open your passport →</p>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

async function getCertificateNumber(certificateId: string): Promise<string | null> {
  const { repos } = await import("@/data/repositories");
  const cert = await repos().certificates.find((c) => c.id === certificateId);
  return cert?.certificateNumber ?? null;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-travertine/60">{label}</dt>
      <dd className={strong ? "font-display text-gold" : "text-ivory"}>{value}</dd>
    </div>
  );
}
