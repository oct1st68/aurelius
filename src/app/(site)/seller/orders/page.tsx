import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { hasRole } from "@/lib/auth/rbac";
import { listOrdersForSeller } from "@/lib/services/order-service";
import { repos } from "@/data/repositories";
import { formatMoney } from "@/core/money";
import { OrderStatusBadge } from "@/components/commerce/order-status-badge";

export const metadata = { title: "Seller Orders" };

export default async function SellerOrdersPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/seller/orders");
  if (!hasRole(auth.user, "SELLER")) redirect("/seller/dashboard");

  const orders = await listOrdersForSeller(auth.user.id);
  const rows = await Promise.all(
    orders.map(async (order) => ({
      order,
      listing: await repos().listings.find((l) => l.id === order.listingId),
    })),
  );

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Fulfilment</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Your Orders</h1>
      <div className="gold-rule mt-6" />

      <div className="mt-8 space-y-4">
        {rows.map(({ order, listing }) => (
          <Link
            key={order.id}
            href={`/seller/orders/${order.id}`}
            className="panel panel-hover flex items-center gap-4 p-4"
          >
            {listing?.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/media/${listing.images[0].path}`}
                alt=""
                className="h-20 w-16 border border-gold/15 object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-serif-lux truncate text-lg text-ivory">
                {listing?.model ?? "Watch"}
              </p>
              <p className="text-xs text-bronze">
                Order {order.id.slice(-8).toUpperCase()} · {formatMoney(order.total)}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="panel p-12 text-center text-sm text-travertine/60">
            No orders yet.
          </div>
        )}
      </div>
    </div>
  );
}
