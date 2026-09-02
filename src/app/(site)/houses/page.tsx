import Link from "next/link";
import { listBrands } from "@/lib/services/listing-service";

export const metadata = { title: "The Great Houses" };

export default async function HousesPage() {
  const brands = await listBrands();
  return (
    <div className="museum-page">
      <p className="eyebrow">Domus Magna</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">The Great Houses</h1>
      <p className="font-serif-lux mt-4 max-w-2xl text-lg italic leading-relaxed text-travertine/75">
        Ten maisons, each with its own creed and recorded heritage.
      </p>
      <div className="gold-rule mt-8" />

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/houses/${brand.slug}`}
            className="panel panel-hover group flex gap-5 p-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${brand.heroImage}`}
              alt={`${brand.name} — maison emblem`}
              loading="lazy"
              className="h-32 w-24 border border-gold/15 object-cover"
            />
            <div>
              <h2 className="font-display text-lg tracking-[0.15em] text-gold-soft group-hover:text-gold">
                {brand.name}
              </h2>
              <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-bronze">
                {brand.country} · Est. {brand.foundedYear}
              </p>
              <p className="font-serif-lux mt-3 line-clamp-3 text-sm leading-relaxed text-travertine/70">
                {brand.story}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
