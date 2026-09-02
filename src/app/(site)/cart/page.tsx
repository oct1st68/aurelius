import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { getCart } from "@/lib/services/cart-service";
import { getBrandById } from "@/lib/services/listing-service";
import { formatMoney } from "@/core/money";
import { CartLineButtons } from "@/components/commerce/cart-line-buttons";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/cart");

  const lines = await getCart(auth.user.id);
  const total = lines.reduce((sum, line) => sum + line.listing.price.amountCents, 0);

  return (
    <div className="museum-page">
      <p className="eyebrow">Held in Custody</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Your Cart</h1>
      <div className="gold-rule mt-6" />

      {lines.length === 0 ? (
        <div className="panel mt-10 p-16 text-center">
          <p className="font-serif-lux text-xl italic text-travertine/70">
            Your cart is empty — the empire awaits.
          </p>
          <Link href="/watches" className="btn-imperial btn-solid mt-8">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-4">
          {lines.map((line) => (
            <CartRow key={line.item.id} line={line} />
          ))}
          <div className="panel mt-8 flex items-center justify-between p-6">
            <div>
              <p className="eyebrow">Estimated total</p>
              <p className="font-display mt-1 text-2xl text-gold">
                {formatMoney({ amountCents: total, currency: "USD" })}
              </p>
              <p className="mt-1 text-xs text-bronze">
                Shipping & insurance calculated at checkout. Each watch has quantity 1.
              </p>
            </div>
            <Link href="/checkout" className="btn-imperial btn-solid">
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

async function CartRow({ line }: { line: Awaited<ReturnType<typeof getCart>>[number] }) {
  const brand = await getBrandById(line.listing.brandId);
  const image = line.listing.images[0];
  return (
    <div className="panel flex items-center gap-5 p-4">
      <Link href={`/watches/${line.listing.slug}`} className="shrink-0">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/media/${image.path}`}
            alt={image.alt}
            className="h-24 w-20 border border-gold/15 object-cover"
          />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-bronze">{brand.name}</p>
        <Link href={`/watches/${line.listing.slug}`} className="font-serif-lux block truncate text-lg text-ivory hover:text-gold">
          {line.listing.model}
        </Link>
        <p className="text-xs text-travertine/50">
          Ref. {line.listing.referenceNumber} · {line.listing.conditionGrade}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-gold">{formatMoney(line.listing.price)}</p>
        <CartLineButtons listingId={line.listing.id} />
      </div>
    </div>
  );
}
