import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { getOrderForUser } from "@/lib/services/order-service";
import { getListingById } from "@/lib/services/listing-service";
import { formatMoney } from "@/core/money";
import { hasRole, isAdmin } from "@/lib/auth/rbac";
import { OrderStatusBadge } from "@/components/commerce/order-status-badge";
import { OrderActions } from "@/components/commerce/order-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SellerOrderPage({ params }: Props) {
  const { id } = await params;
  const auth = await getSession();
  if (!auth) redirect(`/login?redirectTo=/seller/orders/${id}`);

  const order = await getOrderForUser(id, auth).catch(() => null);
  if (!order) notFound();
  if (order.sellerId !== auth.user.id && !isAdmin(auth.user)) redirect("/seller/orders");

  const listing = await getListingById(order.listingId);
  const isAuthenticator = hasRole(auth.user, "AUTHENTICATOR");

  return (
    <div className="museum-page pb-24 md:pb-12">
      <nav aria-label="Breadcrumb" className="text-xs text-bronze">
        <Link href="/seller/orders" className="hover:text-gold">
          Seller Orders
        </Link>
        <span className="mx-2">/</span>
        <span className="text-travertine/70">{order.id.slice(-8).toUpperCase()}</span>
      </nav>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-ivory">{listing.model}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="gold-rule mt-6" />

      <div className="panel mt-8 p-6">
        <h2 className="eyebrow">Custody timeline</h2>
        <ol className="mt-5">
          {order.timeline.map((event, i) => (
            <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < order.timeline.length - 1 && (
                <span aria-hidden className="absolute left-[7px] top-4 h-full w-px bg-gold/25" />
              )}
              <span
                aria-hidden
                className={`mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border ${
                  i === order.timeline.length - 1 ? "border-gold bg-gold" : "border-gold/50 bg-obsidian"
                }`}
              />
              <div>
                <p className="text-sm text-ivory">{event.note}</p>
                <p className="mt-0.5 text-xs text-bronze">
                  {new Date(event.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel mt-6 p-6">
        <h2 className="eyebrow">Summary</h2>
        <p className="mt-3 text-sm text-ivory">
          Buyer receives at {order.shippingAddress.city || "—"} · Total{" "}
          {formatMoney(order.total)}
        </p>
      </div>

      <OrderActions
        orderId={order.id}
        status={order.status}
        isBuyer={false}
        isSeller
        isAdmin={isAdmin(auth.user)}
        isAuthenticator={isAuthenticator}
      />
    </div>
  );
}
