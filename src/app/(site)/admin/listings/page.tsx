import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { isAdmin } from "@/lib/auth/rbac";
import { repos } from "@/data/repositories";
import { AdminListingRow } from "@/components/admin/admin-listing-row";

export const metadata = { title: "Admin · Moderation" };

export default async function AdminListingsPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/admin/listings");
  if (!isAdmin(auth.user)) redirect("/account");

  const listings = (await repos().listings.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const queue = listings.filter((l) => l.status === "PENDING_REVIEW" || l.status === "CHANGES_REQUESTED");
  const others = listings.filter((l) => l.status !== "PENDING_REVIEW" && l.status !== "CHANGES_REQUESTED").slice(0, 12);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Censura · The Censors</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Listing Moderation</h1>
      <div className="gold-rule mt-6" />

      <section className="mt-8" aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="eyebrow">
          Review queue ({queue.length})
        </h2>
        <div className="mt-4 space-y-4">
          {queue.map((listing) => (
            <AdminListingRow key={listing.id} listing={listing} />
          ))}
          {queue.length === 0 && (
            <p className="panel p-10 text-center text-sm text-travertine/60">
              The queue is clear.
            </p>
          )}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="eyebrow">
          Recent listings
        </h2>
        <div className="mt-4 space-y-4">
          {others.map((listing) => (
            <AdminListingRow key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
}
