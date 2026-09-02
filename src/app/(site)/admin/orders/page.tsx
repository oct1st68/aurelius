import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { isAdmin } from "@/lib/auth/rbac";
import { listAllOrders } from "@/lib/services/order-service";
import { getPaymentForOrder } from "@/lib/services/checkout-service";
import { repos } from "@/data/repositories";
import { AdminRefundRow } from "@/components/admin/admin-refund-row";

export const metadata = { title: "Admin · Orders & Refunds" };

export default async function AdminOrdersPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/admin/orders");
  if (!isAdmin(auth.user)) redirect("/account");

  const orders = await listAllOrders();
  const rows = await Promise.all(
    orders.map(async (order) => ({
      order,
      payment: await getPaymentForOrder(order.id),
      listing: await repos().listings.find((l) => l.id === order.listingId),
    })),
  );

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Fiscus · The Public Treasury</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Orders & Refunds</h1>
      <div className="gold-rule mt-6" />

      <div className="mt-8 space-y-4">
        {rows.map(({ order, payment, listing }) => (
          <AdminRefundRow
            key={order.id}
            order={order}
            payment={payment}
            model={listing?.model ?? "Watch"}
          />
        ))}
        {rows.length === 0 && (
          <p className="panel p-10 text-center text-sm text-travertine/60">No orders yet.</p>
        )}
      </div>
    </div>
  );
}

