import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { listOrdersForBuyer } from "@/lib/services/order-service";
import { getBrandById } from "@/lib/services/listing-service";
import { formatMoney } from "@/core/money";
import { OrderStatusBadge } from "@/components/commerce/order-status-badge";

export const metadata = { title: "Your Orders" };

export default async function OrdersPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/account/orders");
  const orders = await listOrdersForBuyer(auth.user.id);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Your Acquisitions</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Orders</h1>
      <div className="gold-rule mt-6" />

      {orders.length === 0 ? (
        <div className="panel mt-10 p-16 text-center">
          <p className="font-serif-lux text-xl italic text-travertine/70">No orders yet.</p>
          <Link href="/watches" className="btn-imperial btn-solid mt-8">
            Begin the hunt
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

async function OrderRow({ order }: { order: Awaited<ReturnType<typeof listOrdersForBuyer>>[number] }) {
  const listing = await (await import("@/data/repositories")).repos().listings.find(
    (l) => l.id === order.listingId,
  );
  if (!listing) return null;
  const brand = await getBrandById(listing.brandId);
  return (
    <Link href={`/orders/${order.id}`} className="panel panel-hover flex items-center gap-5 p-4">
      {listing.images[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/media/${listing.images[0].path}`}
          alt={listing.images[0].alt}
          className="h-24 w-20 border border-gold/15 object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-bronze">{brand.name}</p>
        <p className="font-serif-lux truncate text-lg text-ivory">{listing.model}</p>
        <p className="text-xs text-travertine/50">
          Order {order.id.slice(-8).toUpperCase()} · {formatMoney(order.total)}
        </p>
      </div>
      <OrderStatusBadge status={order.status} />
    </Link>
  );
}
