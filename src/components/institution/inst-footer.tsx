import Link from "next/link";

export function InstFooter() {
  return (
    <footer
      className="bg-void"
      style={{ borderTop: "1px solid rgba(117, 96, 71, 0.24)" }}
    >
      <div className="mx-auto max-w-[110rem] px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1fr_auto]">
          <div>
            <p className="font-display text-[15px] tracking-[0.34em] text-bone">AURELIUS</p>
            <p className="mt-5 max-w-md font-serif-lux text-lg leading-relaxed text-ash">
              A private register of rare instruments. By appointment.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col items-start gap-4 md:items-end">
            {[
              { href: "/watches", label: "Collection" },
              { href: "/certificate", label: "Provenance" },
              { href: "/archives", label: "Journal" },
              { href: "/register", label: "Request access" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] tracking-[0.08em] text-ash transition-colors duration-300 hover:text-bone"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div
          className="mt-14 flex flex-col justify-between gap-3 pt-6 text-[12px] leading-relaxed text-ash sm:flex-row"
          style={{ borderTop: "1px solid rgba(117, 96, 71, 0.16)" }}
        >
          <p>© {new Date().getFullYear()} AURELIUS. Private horology institution.</p>
          <p>Inventory, provenance records, and custody — maintained with modern precision.</p>
        </div>
      </div>
    </footer>
  );
}
