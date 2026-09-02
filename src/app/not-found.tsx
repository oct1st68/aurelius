import Link from "next/link";

export default function NotFound() {
  return (
    <div className="museum-page flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">Uncharted territory</p>
      <h1 className="editorial-title mt-4 text-center text-bone">This page is not part of the empire.</h1>
      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ash">
        The address may be mistyped, or the piece you are looking for has left
        the register.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/watches" className="btn-imperial btn-solid">
          Browse the collection
        </Link>
        <Link href="/" className="btn-imperial">
          Return to the entrance
        </Link>
      </div>
    </div>
  );
}
