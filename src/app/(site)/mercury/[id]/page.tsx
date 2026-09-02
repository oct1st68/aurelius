import { notFound } from "next/navigation";
import { repos } from "@/data/repositories";
import { queryCatalog } from "@/lib/services/listing-service";
import { WatchCard } from "@/components/commerce/watch-card";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Storefront" };

/** MERCURY MARKET — public seller storefront. */
export default async function StorefrontPage({ params }: Props) {
  const { id } = await params;
  const seller = await repos().users.find((u) => u.id === id);
  if (!seller || !seller.roles.includes("SELLER")) notFound();

  const catalog = await queryCatalog({ sellerId: seller.id, perPage: 48, sort: "newest" });

  return (
    <div className="museum-page">
      <p className="eyebrow">Mercury Market · Officina</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">{seller.displayName}</h1>
      <p className="mt-3 text-sm text-travertine/65">
        Independent seller within the empire · {catalog.total} piece{catalog.total === 1 ? "" : "s"} listed
      </p>
      <div className="gold-rule mt-6" />

      {catalog.items.length === 0 ? (
        <p className="panel mt-10 p-12 text-center text-sm text-travertine/60">
          This seller has no published pieces at the moment.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catalog.items.map((listing) => (
            <WatchCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
