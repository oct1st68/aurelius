import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { listOrdersForBuyer } from "@/lib/services/order-service";
import { listOffersForBuyer } from "@/lib/services/offer-service";
import { listNotifications, unreadCount } from "@/lib/services/notification-service";
import { changePasswordAction } from "@/app/(site)/actions/auth-actions";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { OrderStatusBadge } from "@/components/commerce/order-status-badge";
import { formatMoney } from "@/core/money";

export const metadata = { title: "Your Account" };

export default async function AccountPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/account");

  const [orders, offerViews, notifications, unread] = await Promise.all([
    listOrdersForBuyer(auth.user.id),
    listOffersForBuyer(auth.user.id),
    listNotifications(auth.user.id),
    unreadCount(auth.user.id),
  ]);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Civis Romanus</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">{auth.user.displayName}</h1>
      <p className="mt-2 text-sm text-bronze">
        {auth.user.email} · Roles: {auth.user.roles.join(", ")}
      </p>
      <div className="gold-rule mt-6" />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard href="/account/orders" label="Orders" value={String(orders.length)} />
        <StatCard href="/account/offers" label="Offers" value={String(offerViews.length)} />
        <StatCard
          href="/account/notifications"
          label="Notifications"
          value={unread > 0 ? `${unread} unread` : "All read"}
        />
      </div>

      <section className="mt-12" aria-labelledby="recent-orders">
        <h2 id="recent-orders" className="eyebrow">
          Recent Orders
        </h2>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-travertine/60">
            No orders yet — <Link href="/watches" className="text-gold underline underline-offset-4">begin the hunt</Link>.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.slice(0, 4).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="panel panel-hover flex items-center justify-between p-4"
                >
                  <span className="text-sm text-ivory">
                    Order {order.id.slice(-8).toUpperCase()} ·{" "}
                    {formatMoney(order.total)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2" aria-label="Account settings">
        <div className="panel p-6">
          <h2 className="font-display text-sm tracking-[0.25em] text-gold">SESSIONS & SECURITY</h2>
          <p className="mt-3 text-sm leading-relaxed text-travertine/65">
            Sessions are server-managed. Changing your password revokes every
            existing session across devices.
          </p>
          <ChangePasswordForm action={changePasswordAction} />
        </div>
        <div className="panel p-6">
          <h2 className="font-display text-sm tracking-[0.25em] text-gold">LATEST NOTIFICATIONS</h2>
          <ul className="mt-4 space-y-3">
            {notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="border-b hairline pb-3 last:border-0">
                <p className={`text-sm ${n.readAt ? "text-travertine/60" : "text-gold"}`}>
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-travertine/50">{n.body}</p>
              </li>
            ))}
            {notifications.length === 0 && (
              <li className="text-sm text-travertine/60">Nothing new in the empire.</li>
            )}
          </ul>
          <Link href="/account/notifications" className="btn-imperial mt-5 !min-h-9 px-4 text-[10px]">
            All notifications
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="panel panel-hover p-6">
      <p className="font-display text-2xl text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-bronze">{label}</p>
    </Link>
  );
}
