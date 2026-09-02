import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { hasRole } from "@/lib/auth/rbac";
import { payoutService } from "@/lib/services/payout-service";
import { repos } from "@/data/repositories";
import { formatMoney } from "@/core/money";

export const metadata = { title: "Payouts" };

export default async function SellerPayoutsPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/seller/payouts");
  if (!hasRole(auth.user, "SELLER")) redirect("/seller/dashboard");

  const payouts = await payoutService.listForSeller(auth.user.id);
  const rows = await Promise.all(
    payouts.map(async (p) => ({
      payout: p,
      order: await repos().orders.find((o) => o.id === p.orderId),
    })),
  );
  const total = payouts
    .filter((p) => p.status === "RELEASED")
    .reduce((sum, p) => sum + p.amount.amountCents, 0);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Aerarium · The Treasury</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Payouts</h1>
      <p className="mt-3 text-sm text-travertine/65">
        Released so far: <span className="font-display text-gold">{formatMoney({ amountCents: total, currency: "USD" })}</span>
        {" "}· escrow custody (5% platform fee deducted)
      </p>
      <div className="gold-rule mt-6" />

      <div className="mt-8 overflow-x-auto">
        <table className="table-imperial min-w-[560px]">
          <thead>
            <tr>
              <th>Order</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Released</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ payout, order }) => (
              <tr key={payout.id}>
                <td>
                  {order ? (
                    <Link href={`/orders/${order.id}`} className="text-gold underline underline-offset-4">
                      {order.id.slice(-8).toUpperCase()}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-gold">{formatMoney(payout.amount)}</td>
                <td>
                  <span className={`badge ${payout.status === "RELEASED" ? "badge-ok" : "badge-warn"}`}>
                    {payout.status.toLowerCase()}
                  </span>
                </td>
                <td className="text-travertine/60">
                  {payout.releasedAt ? new Date(payout.releasedAt).toLocaleDateString("en-US") : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-travertine/60">
                  No payouts yet — they appear when orders complete.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
