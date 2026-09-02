import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { passportService } from "@/lib/services/passport-service";
import { getListingById, getBrandById } from "@/lib/services/listing-service";
import { repos } from "@/data/repositories";
import { formatTimestamp } from "@/lib/services/admin-service";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Digital Watch Passport" };

/**
 * DIGITAL WATCH PASSPORT — created when an order completes.
 * Sensitive ownership details only resolve for the owner or authorized staff.
 */
export default async function PassportPage({ params }: Props) {
  const { id } = await params;
  const passport = await passportService.getById(id).catch(() => null);
  if (!passport) notFound();

  const auth = await getSession();
  const canSeeSensitive = passportService.assertCanViewSensitive(auth, passport);
  const listing = await getListingById(passport.listingId);
  const brand = await getBrandById(listing.brandId);
  const certificate = passport.certificateId
    ? (await repos().certificates.find((c) => c.id === passport.certificateId)) ?? null
    : null;
  const owner = await repos().users.find((u) => u.id === passport.ownerId);

  return (
    <div className="museum-page">
      <div className="panel relative overflow-hidden p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 10%, #b89b5e 0%, transparent 40%)",
          }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Digitale Digitale · Watch Passport</p>
              <h1 className="font-display mt-2 text-4xl text-ivory">{brand.name}</h1>
              <p className="font-serif-lux mt-1 text-2xl italic text-gold">{listing.model}</p>
            </div>
            <div className="text-right">
              <span className="badge badge-ok">Certified</span>
              <p className="mt-2 font-mono text-xs tracking-widest text-bronze">
                {passport.id.slice(-12).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="gold-rule my-8" />

          <div className="grid gap-8 sm:grid-cols-2">
            <dl className="space-y-4">
              <Field label="Reference" value={listing.referenceNumber} />
              <Field label="Year" value={String(listing.year)} />
              <Field label="Serial (masked)" value={passport.serialMasked} mono />
              {canSeeSensitive && (
                <Field label="Serial (authorized view)" value={listing.serialNumber} mono />
              )}
              <Field
                label="Authentication"
                value={
                  certificate
                    ? `Certificate ${certificate.certificateNumber}`
                    : "AURELIUS Certified"
                }
                link={certificate ? `/certificate?number=${certificate.certificateNumber}` : undefined}
              />
            </dl>

            <dl className="space-y-4">
              <Field label="Purchase date" value={formatTimestamp(passport.createdAt).split(",")[0] ?? ""} />
              <Field
                label="Custodian"
                value={
                  canSeeSensitive && owner
                    ? owner.displayName
                    : "Registered (private)"
                }
              />
              <Field
                label="Documents on file"
                value={passport.documents.map((d) => d.name).join(", ") || "—"}
              />
            </dl>
          </div>

          <section className="mt-10" aria-labelledby="service-history">
            <h2 id="service-history" className="eyebrow">
              Service history
            </h2>
            <ol className="mt-4 space-y-3">
              {passport.serviceHistory.map((entry, i) => (
                <li key={i} className="border-l-2 border-gold/40 pl-4 text-sm text-travertine/80">
                  <p>{entry.note}</p>
                  <p className="mt-0.5 text-xs text-bronze">
                    {new Date(entry.at).toLocaleDateString("en-US")} · {entry.by}
                  </p>
                </li>
              ))}
              {passport.serviceHistory.length === 0 && (
                <li className="text-sm text-travertine/60">No service recorded.</li>
              )}
            </ol>
          </section>

          <p className="mt-10 border-t hairline pt-6 text-[11px] leading-relaxed text-bronze">
            This Digital Watch Passport is a private record of the piece&rsquo;s
            provenance within AURELIUS. Full serial details are
            visible only to the registered custodian and authorized staff.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/account/orders" className="text-xs text-gold underline underline-offset-4">
          Back to your orders
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div>
      <dt className="label-imperial">{label}</dt>
      <dd className={`text-ivory ${mono ? "font-mono tracking-widest" : ""}`}>
        {link ? (
          <Link href={link} className="text-gold underline underline-offset-4">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}