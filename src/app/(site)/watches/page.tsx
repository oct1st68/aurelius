import Link from "next/link";
import { queryCatalog, type CatalogQuery } from "@/lib/services/listing-service";
import { WatchCard } from "@/components/commerce/watch-card";
import { FilterPanel } from "@/components/commerce/filter-panel";
import { MobileFilterButton } from "@/components/commerce/mobile-filter-button";
import { SortSelect } from "@/components/commerce/sort-select";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata = { title: "The Catalog" };

export default async function WatchesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query: CatalogQuery = {
    q: first(sp.q),
    brand: first(sp.brand),
    movement: first(sp.movement),
    minPriceCents: first(sp.min) ? Number(first(sp.min)) * 100 : undefined,
    maxPriceCents: first(sp.max) ? Number(first(sp.max)) * 100 : undefined,
    collections: first(sp.collection)?.split(","),
    sort: (first(sp.sort) as CatalogQuery["sort"]) ?? "newest",
    page: first(sp.page) ? Number(first(sp.page)) : 1,
  };
  const catalog = await queryCatalog(query);

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      const v = first(value);
      if (v && key !== "page") params.set(key, v);
    }
    params.set("page", String(page));
    return `/watches?${params.toString()}`;
  };

  return (
    <div className="museum-page">
      <p className="eyebrow">The Catalog</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl text-ivory">All Watches</h1>
        <p className="text-sm text-bronze">
          {catalog.total} piece{catalog.total === 1 ? "" : "s"} available
        </p>
      </div>
      <div className="gold-rule mt-6" />

      <div className="mt-8 flex gap-10">
        {/* Desktop filters */}
        <aside className="hidden w-64 shrink-0 lg:block" aria-label="Filters">
          <FilterPanel brands={catalog.brands} current={sp} />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-4">
            <MobileFilterButton brands={catalog.brands} current={sp} />
            <SortSelect current={query.sort ?? "newest"} />
          </div>
          {catalog.items.length === 0 ? (
            <div className="panel p-16 text-center">
              <p className="font-serif-lux text-xl italic text-travertine/70">
                The empire offers no pieces matching this quest.
              </p>
              <Link href="/watches" className="btn-imperial mt-6">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="reveal-stagger grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {catalog.items.map((listing) => (
                <WatchCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {catalog.totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
              {catalog.page > 1 && (
                <Link href={buildPageHref(catalog.page - 1)} className="btn-imperial !min-h-10 px-4 text-[11px]">
                  Previous
                </Link>
              )}
              <span className="px-4 text-sm text-bronze">
                Page {catalog.page} of {catalog.totalPages}
              </span>
              {catalog.page < catalog.totalPages && (
                <Link href={buildPageHref(catalog.page + 1)} className="btn-imperial !min-h-10 px-4 text-[11px]">
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
