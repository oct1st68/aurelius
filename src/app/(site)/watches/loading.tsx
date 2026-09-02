export default function CatalogLoading() {
  return (
    <div className="museum-page" role="status" aria-label="Loading the catalog">
      <div className="h-3 w-24 animate-pulse bg-black/10" />
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="h-10 w-56 animate-pulse bg-black/10" />
        <div className="h-9 w-32 animate-pulse bg-black/10" />
      </div>
      <div className="mt-10 flex gap-10">
        <div className="hidden w-64 shrink-0 space-y-5 lg:block" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-black/[0.06]" />
          ))}
        </div>
        <div className="grid flex-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} aria-hidden>
              <div className="aspect-[4/5] animate-pulse bg-black/[0.06]" />
              <div className="mt-4 h-3 w-24 animate-pulse bg-black/10" />
              <div className="mt-2 h-6 w-40 animate-pulse bg-black/10" />
              <div className="mt-2 h-3 w-32 animate-pulse bg-black/[0.07]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
