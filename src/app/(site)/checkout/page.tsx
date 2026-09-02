import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { getCart } from "@/lib/services/cart-service";
import { CheckoutList } from "@/components/commerce/checkout-list";
import { formatMoney } from "@/core/money";
import { SHIPPING_FLAT_CENTS, INSURANCE_BPS } from "@/lib/services/checkout-service";

export const metadata = { title: "Checkout" };

/**
 * Cart checkout: one order per listing (quantity is always 1). This page
 * creates one order per cart line via the client component's sequential
 * calls; each order is independently escrow-tracked.
 */
export default async function CheckoutPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/checkout");

  const lines = await getCart(auth.user.id);
  if (lines.length === 0) redirect("/cart");

  const items = lines.map((line) => ({
    listingId: line.listing.id,
    model: line.listing.model,
    brandId: line.listing.brandId,
    ref: line.listing.referenceNumber,
    priceCents: line.listing.price.amountCents,
    image: line.listing.images[0]?.path ?? "",
    shippingCents: SHIPPING_FLAT_CENTS,
    insuranceCents: Math.round((line.listing.price.amountCents * INSURANCE_BPS) / 10_000),
  }));
  const grandTotal = items.reduce((sum, i) => sum + i.priceCents + i.shippingCents + i.insuranceCents, 0);

  return (
    <div className="museum-page">
      <p className="eyebrow">Sealed in Escrow</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Checkout</h1>
      <div className="gold-rule mt-6" />
      <CheckoutList
        items={items}
        grandTotal={formatMoney({ amountCents: grandTotal, currency: "USD" })}
      />
    </div>
  );
}
