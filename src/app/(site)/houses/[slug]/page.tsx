import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandBySlug, queryCatalog } from "@/lib/services/listing-service";
import { WatchCard } from "@/components/commerce/watch-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug).catch(() => null);
  return { title: brand ? brand.name : "House not found" };
}

export default async function HousePage({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug).catch(() => null);
  if (!brand) notFound();
  const catalog = await queryCatalog({ brand: brand.id, perPage: 48 });

  return (
    <div className="museum-page">
      <nav aria-label="Breadcrumb" className="text-xs text-bronze">
        <Link href="/houses" className="hover:text-gold">
          The Great Houses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-travertine/70">{brand.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[300px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/media/${brand.heroImage}`}
          alt={`${brand.name} — maison emblem`}
          className="h-80 w-full border border-gold/15 object-cover lg:h-96"
        />
        <div>
          <p className="eyebrow">
            {brand.country} · Est. {brand.foundedYear}
          </p>
          <h1 className="font-display mt-2 text-5xl text-ivory">{brand.name}</h1>
          <div className="gold-rule mt-6 w-32" />
          <p className="font-serif-lux mt-6 text-lg leading-relaxed text-travertine/85">
            {brand.story}
          </p>
        </div>
      </div>

      <section className="mt-14" aria-labelledby="house-watches">
        <h2 id="house-watches" className="eyebrow">
          Pieces from this house ({catalog.total})
        </h2>
        {catalog.items.length === 0 ? (
          <p className="mt-6 text-sm text-travertine/60">
            No pieces from this house are currently on the market.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {catalog.items.map((listing) => (
              <WatchCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
