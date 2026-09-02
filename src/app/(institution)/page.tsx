import Link from "next/link";

const HOUSES = [
  { numeral: "I", name: "Constantin Helios", year: 1755, country: "Genève", slug: "constantin-helios" },
  { numeral: "II", name: "Aurelius & Fils", year: 1848, country: "Paris", slug: "aurelius-fils" },
  { numeral: "III", name: "Meridian & Söhne", year: 1845, country: "Saxony", slug: "meridian-sohne" },
  { numeral: "IV", name: "House of Janus", year: 1860, country: "Le Sentier", slug: "house-of-janus" },
  { numeral: "V", name: "Saturn & Co.", year: 1894, country: "London", slug: "saturn-co" },
  { numeral: "VI", name: "Olympia Chronométrie", year: 1901, country: "La Chaux-de-Fonds", slug: "olympia-chronometrie" },
  { numeral: "VII", name: "Trajan Instruments", year: 1937, country: "Florence", slug: "trajan-instruments" },
  { numeral: "VIII", name: "Minerva Horologie", year: 1858, country: "Villeret", slug: "minerva-horologie" },
  { numeral: "IX", name: "Vestal & Roma", year: 1926, country: "Rome", slug: "vestal-roma" },
  { numeral: "X", name: "Aquilia Fabrica", year: 1884, country: "Zürich", slug: "aquilia-fabrica" },
];

const CUSTODY = [
  {
    label: "Authentication",
    body: "Every instrument passes the atelier before dispatch — movement, dial, case geometry, and serial, verified against house records.",
  },
  {
    label: "Provenance",
    body: "Records travel with the piece. A digital passport — certificate, ownership line, and service history — is issued on completion.",
  },
  {
    label: "Custody",
    body: "Funds remain in escrow-style custody until delivery is confirmed. Insured throughout transit.",
  },
];

export default function InstitutionPage() {
  return (
    <div className="bg-void text-bone">
      {/* ── I · Opening ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden">
        <div className="grid w-full grid-cols-1 items-end gap-10 lg:grid-cols-12">
          <div className="px-5 pb-20 pt-32 sm:px-8 lg:col-span-6 lg:pb-28">
            <p className="animate-fade-up text-[11px] uppercase tracking-[0.24em] text-ash">
              Private horology · Est. MMXXV
            </p>
            <h1 className="mt-8 animate-fade-up font-serif-lux text-[clamp(3.5rem,8vw,7.5rem)] font-light leading-[0.95] text-bone" style={{ animationDelay: "120ms" }}>
              Artifacts of&nbsp;
              <em className="antique-gold-i">time</em>.
            </h1>
            <p className="mt-8 max-w-md animate-fade-up text-[15px] leading-[1.8] text-ash" style={{ animationDelay: "240ms" }}>
              A register of rare instruments, kept for those who measure life in
              centuries. Each piece enters the record once — and is never
              entered again.
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-8 animate-fade-up" style={{ animationDelay: "360ms" }}>
              <Link
                href="/watches"
                className="border border-oxblood bg-oxblood px-8 py-4 text-[12px] uppercase tracking-[0.16em] text-bone transition-colors duration-300 hover:bg-deep-wine hover:border-deep-wine"
              >
                View the collection
              </Link>
              <Link
                href="/certificate"
                className="border-b pb-1 text-[13px] tracking-[0.06em] text-ash transition-colors duration-300 hover:border-ash hover:text-bone"
                style={{ borderBottomColor: "var(--line-strong)" }}
              >
                How provenance works
              </Link>
            </div>
          </div>
          <div className="relative lg:col-span-6 lg:self-stretch">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/photos/w08.jpg"
              alt="A vintage pocket chronometer on a blackened steel chain, Roman numerals catching low light"
              fetchPriority="high"
              className="emerge-on-load h-[60vh] w-full object-cover lg:h-full"
            />
          </div>
        </div>
      </section>

      {/* ── II · The register opens ─────────────────────────────────── */}
      <section className="bg-void px-5 py-40 sm:px-8 sm:py-56">
        <div className="mx-auto max-w-[110rem]">
          <p className="scroll-emerge font-display text-[clamp(4rem,12vw,11rem)] font-medium leading-none text-charcoal">
            MMXXV
          </p>
          <p className="mt-8 max-w-xs text-[14px] leading-[1.9] text-ash">
            The register is opened by hand, seasonally. Entries are numbered,
            dated, and never withdrawn.
          </p>
        </div>
      </section>

      {/* ── III · Artifact I ────────────────────────────────────────── */}
      <section className="bg-coal">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/photos/w15.jpg"
              alt="A pocket watch suspended from its chain against darkness"
              loading="lazy"
              className="h-full max-h-[85vh] w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center px-5 py-24 sm:px-12 lg:col-span-5 lg:py-40 lg:pr-24">
            <p className="text-[11px] uppercase tracking-[0.24em] text-ash">Lot I · Held in register</p>
            <p className="mt-10 font-serif-lux text-[clamp(1.6rem,2.4vw,2.4rem)] font-light italic leading-[1.5] text-bone">
              Pocket chronometer, chain of blackened steel.
              Acquired 1911. One owner.
              Never polished.
            </p>
            <Link
              href="/saturn"
              className="mt-12 w-fit border-b pb-1 text-[13px] tracking-[0.06em] text-ash transition-colors duration-300 hover:border-ash hover:text-bone"
              style={{ borderBottomColor: "var(--line-strong)" }}
            >
              Enter the vintage register
            </Link>
          </div>
        </div>
      </section>

      {/* ── IV · On provenance (parchment interrupt) ────────────────── */}
      <section className="bg-parchment text-[#1c1712]">
        <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8 sm:py-32">
          <p className="text-[11px] uppercase tracking-[0.24em] text-ox-bronze">On provenance</p>
          <h2 className="mt-8 font-serif-lux text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1.15]">
            A watch without its record is only metal.
          </h2>
          <p className="mt-10 font-serif-lux text-lg leading-[1.9]">
            <span className="float-left mr-3 font-display text-6xl leading-[0.8] text-oxblood">E</span>
            very entry in this register carries its lineage: where it was made,
            who kept it, what was serviced and when. Before any instrument is
            offered, the atelier reads the piece against its records — movement,
            dial, case, serial. What cannot be verified does not enter.
          </p>
          <dl className="reveal-stagger mt-14 border-t border-[#1c1712]/20">
            {CUSTODY.map((row) => (
              <div key={row.label} className="grid gap-2 border-b border-[#1c1712]/20 py-6 sm:grid-cols-[10rem_1fr] sm:gap-8">
                <dt className="text-[11px] uppercase tracking-[0.18em] text-ox-bronze sm:pt-1">
                  {row.label}
                </dt>
                <dd className="text-[15px] leading-[1.75] text-[#3a3227]">{row.body}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/certificate"
            className="mt-12 inline-block border-b pb-1 text-[13px] tracking-[0.06em] text-[#1c1712] transition-colors duration-300 hover:text-oxblood"
            style={{ borderBottomColor: "rgba(28, 23, 18, 0.4)" }}
          >
            Verify a certificate
          </Link>
        </div>
      </section>

      {/* ── V · Register of houses ──────────────────────────────────── */}
      <section className="bg-void px-5 py-28 sm:px-8 sm:py-36">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-ash">The register of houses</p>
          <ul className="reveal-stagger mt-12 border-t border-charcoal">
            {HOUSES.map((house) => (
              <li key={house.slug} className="border-b border-charcoal">
                <Link
                  href={`/houses/${house.slug}`}
                  className="group flex min-h-16 items-baseline gap-6 py-5 transition-[padding] duration-300 hover:pl-4 sm:gap-10"
                >
                  <span className="w-8 shrink-0 font-display text-[12px] text-ox-bronze transition-colors duration-300 group-hover:text-antique-gold">
                    {house.numeral}
                  </span>
                  <span className="flex-1 font-serif-lux text-[clamp(1.4rem,2.6vw,2rem)] font-light text-bone">
                    {house.name}
                  </span>
                  <span className="hidden text-[12px] tracking-[0.08em] text-ash sm:block">
                    {house.country} · Est. {house.year}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── VI · Private acquisition (oxblood ceremony) ─────────────── */}
      <section className="bg-oxblood">
        <div className="mx-auto max-w-[110rem] px-5 py-28 sm:px-8 sm:py-36">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-bone/60">Private acquisition</p>
            <h2 className="mt-8 font-serif-lux text-[clamp(2.25rem,5vw,4.5rem)] font-light leading-[1.08] text-bone">
              Acquisitions are conducted privately.
            </h2>
            <p className="mt-8 max-w-lg text-[15px] leading-[1.8] text-bone/70">
              Access is granted by introduction or application. Once admitted,
              the register is shown in full — including pieces never listed
              publicly.
            </p>
            <Link
              href="/register"
              className="mt-12 inline-block border border-bone/60 px-10 py-4 text-[12px] uppercase tracking-[0.16em] text-bone transition-colors duration-300 hover:bg-bone hover:text-oxblood"
            >
              Request access
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
