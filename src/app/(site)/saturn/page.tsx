import { queryCatalog } from "@/lib/services/listing-service";
import { WatchCard } from "@/components/commerce/watch-card";

export const metadata = {
  title: "Saturn Collection",
  description: "Vintage, rare, and historically significant timepieces.",
};

/** SATURN — god of time and the harvest; the vintage wing of the empire. */
export default async function SaturnPage() {
  const catalog = await queryCatalog({ collections: ["SATURN"], sort: "year_asc", perPage: 48 });

  return (
    <div className="museum-page">
      <p className="eyebrow">Saturnus · The Keeper of Time</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">The Saturn Collection</h1>
      <p className="font-serif-lux mt-4 max-w-2xl text-lg italic leading-relaxed text-travertine/75">
        Vintage, rare, and historically significant watches — pieces that have
        already outlived their first owners and intend to outlive us all.
      </p>
      <div className="gold-rule mt-8" />
      <p className="mt-6 text-sm text-bronze">{catalog.total} pieces in the collection</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {catalog.items.map((listing) => (
          <WatchCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
