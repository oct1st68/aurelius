import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { hasRole } from "@/lib/auth/rbac";
import { listBrands } from "@/lib/services/listing-service";
import { ListingWizard } from "@/components/seller/listing-wizard";

export const metadata = { title: "New Listing" };

const STEPS = ["I · Identity", "II · Specifications", "III · Condition", "IV · Documentation", "V · Photography", "VI · Pricing", "VII · Review"];

export default async function NewListingPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/seller/listings/new");
  if (!hasRole(auth.user, "SELLER")) redirect("/seller/dashboard");

  const brands = await listBrands();

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Mercury Market · Listing Wizard</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Offer a Piece to the Empire</h1>
      <div className="gold-rule mt-6" />
      <ListingWizard
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        steps={STEPS}
      />
    </div>
  );
}
