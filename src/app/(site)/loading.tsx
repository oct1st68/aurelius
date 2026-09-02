export default function RootLoading() {
  return (
    <div className="museum-page" role="status" aria-label="Loading">
      <div className="max-w-4xl">
        <div className="h-3 w-28 animate-pulse bg-white/10" />
        <div className="mt-5 h-12 w-3/4 animate-pulse bg-white/10" />
        <div className="mt-4 space-y-2.5">
          <div className="h-4 w-full animate-pulse bg-white/[0.06]" />
          <div className="h-4 w-5/6 animate-pulse bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}
