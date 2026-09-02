import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { getOrderForUser } from "@/lib/services/order-service";
import { getListingById } from "@/lib/services/listing-service";
import { quoteFor, SHIPPING_FLAT_CENTS, INSURANCE_BPS } from "@/lib/services/checkout-service";
import { formatMoney } from "@/core/money";
import { CheckoutPayment } from "@/components/commerce/checkout-payment";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Checkout" };

/** Offer-driven checkout: one specific order awaiting payment. */
export default async function CheckoutOrderPage({ params }: Props) {
  const { id } = await params;
  const auth = await getSession();
  if (!auth) redirect(`/login?redirectTo=/checkout/${id}`);

  const order = await getOrderForUser(id, auth).catch(() => null);
  if (!order) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${order.id}`);
  if (order.buyerId !== auth.user.id) redirect("/account/orders");

  const listing = await getListingById(order.listingId);
  const quote = quoteFor(order);

  return (
    <div className="museum-page">
      <p className="eyebrow">Sealed in Escrow</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Complete Your Purchase</h1>
      <div className="gold-rule mt-6" />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <CheckoutPayment
          orderId={order.id}
          totalLabel={formatMoney(quote.total)}
        />
        <aside className="panel h-fit p-6" aria-label="Order summary">
          <h2 className="font-display text-sm tracking-[0.25em] text-gold">ORDER</h2>
          {listing.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/media/${listing.images[0].path}`}
              alt={listing.images[0].alt}
              className="mt-4 aspect-[4/3] w-full border border-gold/15 object-cover"
            />
          )}
          <p className="font-serif-lux mt-4 text-lg text-ivory">{listing.model}</p>
          <p className="text-xs text-bronze">Ref. {listing.referenceNumber}</p>
          <dl className="mt-5 space-y-2.5 text-sm">
            <Row label="Agreed price" value={formatMoney(quote.itemPrice)} />
            <Row
              label={`Shipping (flat)`}
              value={formatMoney({ amountCents: SHIPPING_FLAT_CENTS, currency: order.currency })}
            />
            <Row
              label={`Insurance (${INSURANCE_BPS / 100}%)`}
              value={formatMoney(quote.insuranceCost)}
            />
            <div className="gold-rule my-3" />
            <Row label="Total" value={formatMoney(quote.total)} strong />
          </dl>
          <p className="mt-5 text-[11px] leading-relaxed text-bronze">
            After payment the watch ships to AURELIUS authentication before
            reaching you. Funds remain in custody until you confirm delivery.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-travertine/60">{label}</dt>
      <dd className={strong ? "font-display text-gold" : "text-ivory"}>{value}</dd>
    </div>
  );
}
