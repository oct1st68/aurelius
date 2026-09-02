import Link from "next/link";
import { queryCatalog, getBrandById } from "@/lib/services/listing-service";
import { formatMoney } from "@/core/money";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: "Janus — Compare" };

const MAX_COMPARE = 4;

/** JANUS — the two-faced god; compare 2–4 watches side by side. */
export default async function JanusPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const idsParam = sp.ids;
  const ids = (Array.isArray(idsParam) ? idsParam.join(",") : idsParam ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, MAX_COMPARE);

  const catalog = await queryCatalog({ perPage: 48 });
  const compared = await Promise.all(
    ids.map(async (id) => {
      const listing = catalog.items.find((l) => l.id === id) ??
        (await queryCatalog({ perPage: 48, q: id }).then((c) => c.items[0])) ??
        null;
      return listing;
    }),
  );
  const items = compared.filter((l): l is NonNullable<typeof l> => l !== null);
  const brands = await Promise.all(items.map((l) => getBrandById(l.brandId)));

  const specRows: { label: string; get: (l: (typeof items)[number]) => string }[] = [
    { label: "Price", get: (l) => formatMoney(l.price) },
    { label: "Reference", get: (l) => l.referenceNumber },
    { label: "Year", get: (l) => String(l.year) },
    { label: "Movement", get: (l) => l.movement },
    { label: "Case", get: (l) => `${l.caseMaterial} · ${l.caseDiameterMm}mm` },
    { label: "Dial", get: (l) => l.dialColor },
    { label: "Bracelet", get: (l) => l.bracelet },
    { label: "Water resist.", get: (l) => (l.waterResistanceM > 0 ? `${l.waterResistanceM}m` : "—") },
    { label: "Power reserve", get: (l) => (l.powerReserveHours ? `${l.powerReserveHours}h` : "—") },
    { label: "Condition", get: (l) => l.conditionGrade },
    { label: "Box & papers", get: (l) => l.boxAndPapers.replace(/_/g, " ").toLowerCase() },
  ];

  const toggleHref = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, MAX_COMPARE);
    return `/janus?ids=${next.join(",")}`;
  };

  return (
    <div className="museum-page">
      <p className="eyebrow">Ianus · Keeper of Doorways</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Compare Watches</h1>
      <p className="mt-3 text-sm text-travertine/65">
        Select two to four watches below — they face each other like the god of thresholds.
      </p>
      <div className="gold-rule mt-6" />

      {/* Selection grid */}
      <div className="mt-8">
        <p className="eyebrow">Catalog ({catalog.items.length})</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {catalog.items.map((listing) => {
            const selected = ids.includes(listing.id);
            const brandName = brands.find((b) => b.id === listing.brandId)?.name;
            return (
              <Link
                key={listing.id}
                href={toggleHref(listing.id)}
                className={`border p-2 text-center transition-colors ${
                  selected ? "border-gold bg-gold/10" : "border-gold/15 hover:border-gold/50"
                }`}
              >
                {listing.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/media/${listing.images[0].path}`}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover"
                  />
                )}
                <p className="mt-2 truncate text-xs text-ivory">{listing.model}</p>
                <p className="truncate text-[10px] text-bronze">{brandName ?? ""}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Comparison table */}
      {items.length >= 2 ? (
        <section className="mt-12 overflow-x-auto" aria-label="Comparison">
          <table className="table-imperial min-w-[640px]">
            <thead>
              <tr>
                <th className="w-36">Attribute</th>
                {items.map((l) => (
                  <th key={l.id}>
                    <Link href={`/watches/${l.slug}`} className="hover:text-gold">
                      {l.model}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specRows.map((row) => (
                <tr key={row.label}>
                  <td className="text-xs uppercase tracking-[0.15em] text-bronze">{row.label}</td>
                  {items.map((l) => (
                    <td key={l.id} className="text-ivory">
                      {row.get(l)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        items.length === 1 && (
          <p className="mt-10 panel p-8 text-center text-sm text-travertine/65">
            One face is not enough for Janus — select at least two watches.
          </p>
        )
      )}
    </div>
  );
}
