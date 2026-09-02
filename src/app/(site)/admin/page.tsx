import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { isAdmin } from "@/lib/auth/rbac";
import { adminStats } from "@/lib/services/admin-service";
import { listAudit } from "@/lib/services/audit-service";
import { formatMoney } from "@/core/money";
import { formatTimestamp } from "@/lib/services/admin-service";

export const metadata = { title: "Admin" };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users & Roles" },
  { href: "/admin/listings", label: "Moderation" },
  { href: "/admin/orders", label: "Orders & Refunds" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default async function AdminPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/admin");
  if (!isAdmin(auth.user)) redirect("/account");

  const [stats, audit] = await Promise.all([adminStats(), listAudit(12)]);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Senatus · The Senate</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Admin Console</h1>
      <div className="gold-rule mt-6" />

      <nav aria-label="Admin sections" className="mt-6 flex flex-wrap gap-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`badge ${item.href === "/admin" ? "border-gold text-gold" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={String(stats.users)} />
        <Stat label="Sellers" value={String(stats.sellers)} />
        <Stat label="Published listings" value={String(stats.listingsPublished)} />
        <Stat label="Awaiting moderation" value={String(stats.listingsPending)} />
        <Stat label="Orders" value={String(stats.orders)} />
        <Stat label="GMV (paid)" value={formatMoney({ amountCents: stats.gmvCents, currency: "USD" })} />
        <Stat label="Certificates" value={String(stats.certificates)} />
        <Stat label="Reviews" value={String(stats.reviews)} />
      </div>

      <section className="mt-12" aria-labelledby="audit-preview">
        <div className="flex items-center justify-between">
          <h2 id="audit-preview" className="eyebrow">
            Recent audit events
          </h2>
          <Link href="/admin/audit" className="text-xs text-gold underline underline-offset-4">
            Full log
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {audit.map((event) => (
            <li key={event.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3.5 text-sm">
              <span className="text-ivory">
                <span className="font-mono text-xs text-gold">{event.action}</span>{" "}
                {event.targetId ? `· ${event.targetType ?? ""} ${event.targetId.slice(-8)}` : ""}
              </span>
              <span className="text-xs text-bronze">{formatTimestamp(event.at)}</span>
            </li>
          ))}
          {audit.length === 0 && (
            <li className="panel p-8 text-center text-sm text-travertine/60">No audit events yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-6">
      <p className="font-display text-2xl text-gold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-bronze">{label}</p>
    </div>
  );
}
