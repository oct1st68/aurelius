import Link from "next/link";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="museum-page">
      <p className="eyebrow">De Imperio</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">About the Empire</h1>
      <div className="gold-rule mt-6" />
      <div className="font-serif-lux mt-8 space-y-6 text-lg leading-relaxed text-travertine/85">
        <p>
          AURELIUS is a localhost demonstration of a multi-vendor luxury watch
          marketplace — named for the philosopher-emperor, styled after the
          architecture and mythology of Rome, and engineered with the discipline
          of a modern commerce platform.
        </p>
        <p>
          Five systems organize the empire: <strong>Saturn</strong> keeps the
          vintage wing, <strong>Janus</strong> compares what stands on either
          side of the threshold, <strong>Mercury</strong> governs commerce,
          <strong> Minerva</strong> curates knowledge, and <strong>Vesta</strong>
          guards your private vault.
        </p>
        <p>
          Every watch that crosses the empire is inspected and certified before
          it reaches its new custodian, and each purchase issues a Digital Watch
          Passport — a private record of the piece&rsquo;s provenance.
        </p>
        <p className="border-l-2 border-gold/40 pl-5 text-base italic text-travertine/70">
          The craft, however, is real.
        </p>
      </div>
      <div className="mt-10 flex gap-4">
        <Link href="/watches" className="btn-imperial btn-solid">
          Enter the catalog
        </Link>
        <Link href="/archives" className="btn-imperial">
          Read the archives
        </Link>
      </div>
    </div>
  );
}
