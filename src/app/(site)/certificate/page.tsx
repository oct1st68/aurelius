import Link from "next/link";
import { notFound } from "next/navigation";
import { getCertificateByNumber } from "@/lib/services/certificate-service";
import { getListingById } from "@/lib/services/listing-service";
import { repos } from "@/data/repositories";
import { CertificateLookup } from "@/components/commerce/certificate-lookup";

export const metadata = { title: "AURELIUS Certified" };

interface Props {
  searchParams: Promise<{ number?: string }>;
}

/** AURELIUS CERTIFIED — public authenticity verification (masked serial). */
export default async function CertificatePage({ searchParams }: Props) {
  const { number } = await searchParams;
  const cert = number ? await getCertificateByNumber(number).catch(() => null) : null;

  return (
    <div className="museum-page">
      <p className="eyebrow">Veritas · The Truth of the Piece</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">AURELIUS Certified</h1>
      <p className="mt-4 text-sm leading-relaxed text-travertine/70">
        Enter a certificate number to verify authenticity. Serial numbers are
        masked on this public page — only the owner and authorized staff can see
        the full serial.
      </p>
      <div className="gold-rule mt-6" />

      <CertificateLookup initialNumber={number ?? ""} />

      {number && !cert && (
        <div className="panel mt-8 border-red-900/50 p-8 text-center" role="alert">
          <p className="text-sm text-red-400">No certificate found for “{number}”.</p>
        </div>
      )}

      {cert && <CertificateCard number={number ?? ""} />}

      <div className="mt-12 text-center">
        <Link href="/watches" className="text-xs text-gold underline underline-offset-4">
          Browse certified-included watches
        </Link>
      </div>
    </div>
  );
}

async function CertificateCard({ number }: { number: string }) {
  const cert = await getCertificateByNumber(number).catch(() => null);
  if (!cert) notFound();
  const listing = await getListingById(cert.listingId);
  const issuer = await repos().users.find((u) => u.id === cert.issuedBy);
  const valid = cert.result === "AUTHENTICATED";

  return (
    <div className="panel mt-8 p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Certificate of Authenticity</p>
          <p className="font-display mt-2 text-3xl tracking-wider text-gold">
            {cert.certificateNumber}
          </p>
        </div>
        <span className={`badge ${valid ? "badge-ok" : "badge-bad"}`}>
          {valid ? "Authenticated" : "Revoked"}
        </span>
      </div>
      <div className="gold-rule my-6" />
      <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
        <Field label="Watch" value={listing.model} />
        <Field label="Reference" value={listing.referenceNumber} />
        <Field label="Year" value={String(listing.year)} />
        <Field label="Serial (masked)" value={cert.serialMasked} mono />
        <Field
          label="Issued"
          value={new Date(cert.issuedAt).toLocaleDateString("en-US", { dateStyle: "long" })}
        />
        <Field label="Inspector" value={issuer?.displayName ?? "AURELIUS Authentication"} />
      </dl>
      <p className="mt-6 border-l-2 border-gold/40 pl-4 text-sm italic leading-relaxed text-travertine/70">
        {cert.notes}
      </p>
      <p className="mt-6 text-[11px] leading-relaxed text-bronze">
        This certificate was issued by the AURELIUS authentication service.
        It attests that the piece matched house records for
        movement, dial, case geometry, and serial at time of inspection.
      </p>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="label-imperial">{label}</dt>
      <dd className={`text-ivory ${mono ? "font-mono tracking-widest" : ""}`}>{value}</dd>
    </div>
  );
}
