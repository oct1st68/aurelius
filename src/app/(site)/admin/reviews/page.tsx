import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { isAdmin } from "@/lib/auth/rbac";
import { repos } from "@/data/repositories";
import { AdminReviewsClient } from "@/components/admin/admin-reviews-client";

export const metadata = { title: "Admin · Reviews" };

export default async function AdminReviewsPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/admin/reviews");
  if (!isAdmin(auth.user)) redirect("/account");

  const reviews = (await repos().reviews.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const buyers = await Promise.all(
    reviews.map(async (r) => (await repos().users.find((u) => u.id === r.buyerId))?.displayName ?? "Buyer"),
  );
  const listings = await Promise.all(
    reviews.map(async (r) => (await repos().listings.find((l) => l.id === r.listingId))?.model ?? "Watch"),
  );

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Forum · Public Opinion</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Reviews</h1>
      <div className="gold-rule mt-6" />
      <AdminReviewsClient
        rows={reviews.map((r, i) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          status: r.status,
          buyer: buyers[i] as string,
          listing: listings[i] as string,
        }))}
      />
    </div>
  );
}
