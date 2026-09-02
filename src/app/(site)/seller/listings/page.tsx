import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { hasRole } from "@/lib/auth/rbac";
import { repos } from "@/data/repositories";
import { formatMoney } from "@/core/money";
import { SubmitForReviewButton } from "@/components/seller/submit-for-review-button";
import { ChangePriceForm } from "@/components/seller/change-price-form";

export const metadata = { title: "Your Listings" };

export default async function SellerListingsPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/seller/listings");
  if (!hasRole(auth.user, "SELLER")) redirect("/seller/dashboard");

  const listings = await repos().listings.findMany((l) => l.sellerId === auth.user.id);
  const sorted = listings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="museum-page pb-24 md:pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1 className="font-display mt-2 text-4xl text-ivory">Your Listings</h1>
        </div>
        <Link href="/seller/listings/new" className="btn-imperial btn-solid">
          + New Listing
        </Link>
      </div>
      <div className="gold-rule mt-6" />

      <div className="mt-8 overflow-x-auto">
        <table className="table-imperial min-w-[760px]">
          <thead>
            <tr>
              <th>Watch</th>
              <th>Status</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((listing) => (
              <tr key={listing.id}>
                <td>
                  <div className="flex items-center gap-3">
                    {listing.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/media/${listing.images[0].path}`}
                        alt=""
                        className="h-14 w-12 border border-gold/15 object-cover"
                      />
                    )}
                    <div>
                      <p className="text-ivory">{listing.model}</p>
                      <p className="text-xs text-bronze">Ref. {listing.referenceNumber}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className={`badge ${
                      listing.status === "PUBLISHED"
                        ? "badge-ok"
                        : listing.status === "PENDING_REVIEW" || listing.status === "CHANGES_REQUESTED"
                          ? "badge-warn"
                          : listing.status === "SOLD" || listing.status === "RESERVED"
                            ? "badge-ok"
                            : "badge-bad"
                    }`}
                  >
                    {listing.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                  {listing.moderationNote && (
                    <p className="mt-1 max-w-48 text-xs text-red-400/80">{listing.moderationNote}</p>
                  )}
                </td>
                <td className="text-gold">{formatMoney(listing.price)}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/seller/listings/${listing.id}`} className="text-xs text-gold underline underline-offset-4">
                      Edit
                    </Link>
                    {(listing.status === "DRAFT" || listing.status === "CHANGES_REQUESTED") && (
                      <SubmitForReviewButton listingId={listing.id} />
                    )}
                    {(listing.status === "PUBLISHED" || listing.status === "APPROVED") && (
                      <ChangePriceForm listingId={listing.id} current={formatMoney(listing.price)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-travertine/60">
                  No listings yet — create your first with the wizard.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
