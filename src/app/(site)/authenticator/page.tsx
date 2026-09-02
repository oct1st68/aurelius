import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { hasRole, isAdmin } from "@/lib/auth/rbac";
import { listInspections } from "@/lib/services/certificate-service";
import { repos } from "@/data/repositories";
import { InspectionActions } from "@/components/authenticator/inspection-actions";

export const metadata = { title: "Authenticator Atelier" };

/** Authenticator dashboard — pending inspections, history, certificates. */
export default async function AuthenticatorPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/authenticator");
  if (!hasRole(auth.user, "AUTHENTICATOR") && !isAdmin(auth.user)) {
    redirect("/account");
  }

  const inspections = await listInspections();
  const pending = inspections.filter((i) => i.status === "QUEUED" || i.status === "IN_PROGRESS");
  const concluded = inspections.filter((i) => i.status !== "QUEUED" && i.status !== "IN_PROGRESS");
  const certificates = (await repos().certificates.list()).sort((a, b) =>
    b.issuedAt.localeCompare(a.issuedAt),
  );
  const enriched = await Promise.all(
    pending.map(async (i) => ({
      inspection: i,
      listing: await repos().listings.find((l) => l.id === i.listingId),
      order: await repos().orders.find((o) => o.id === i.orderId),
    })),
  );

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Veritas · The Atelier of Truth</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Authenticator Dashboard</h1>
      <div className="gold-rule mt-6" />

      <section className="mt-10" aria-labelledby="pending-inspections">
        <h2 id="pending-inspections" className="eyebrow">
          Pending inspections ({pending.length})
        </h2>
        <div className="mt-4 space-y-4">
          {enriched.map(({ inspection, listing, order }) => (
            <div key={inspection.id} className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-serif-lux text-lg text-ivory">
                    {listing?.model ?? "Watch"}{" "}
                    <span className="text-xs text-bronze">Ref. {listing?.referenceNumber}</span>
                  </p>
                  <p className="mt-1 text-xs text-bronze">
                    Order {order?.id.slice(-8).toUpperCase()} · Queued{" "}
                    {new Date(inspection.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
                <span className={`badge ${inspection.status === "QUEUED" ? "badge-warn" : ""}`}>
                  {inspection.status.toLowerCase()}
                </span>
              </div>
              <InspectionActions
                inspectionId={inspection.id}
                orderId={order?.id ?? ""}
                claimed={inspection.assignedTo !== null}
              />
            </div>
          ))}
          {pending.length === 0 && (
            <p className="panel p-10 text-center text-sm text-travertine/60">
              No watches await inspection. The atelier rests.
            </p>
          )}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="inspection-history">
        <h2 id="inspection-history" className="eyebrow">
          Inspection history
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="table-imperial min-w-[640px]">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Outcome</th>
                <th>Notes</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {concluded.map((i) => (
                <tr key={i.id}>
                  <td className="text-ivory">{i.listingId.slice(-8).toUpperCase()}</td>
                  <td>
                    <span className={`badge ${i.status === "APPROVED" ? "badge-ok" : "badge-bad"}`}>
                      {i.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="max-w-80 text-sm text-travertine/70">{i.outcomeNotes}</td>
                  <td className="text-travertine/60">
                    {i.completedAt ? new Date(i.completedAt).toLocaleDateString("en-US") : "—"}
                  </td>
                </tr>
              ))}
              {concluded.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-travertine/60">
                    No concluded inspections yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="certs">
        <h2 id="certs" className="eyebrow">
          Issued certificates
        </h2>
        <ul className="mt-4 space-y-2">
          {certificates.map((c) => (
            <li key={c.id} className="panel flex items-center justify-between p-4 text-sm">
              <Link href={`/certificate?number=${c.certificateNumber}`} className="text-gold underline underline-offset-4">
                {c.certificateNumber}
              </Link>
              <span className={`badge ${c.result === "AUTHENTICATED" ? "badge-ok" : "badge-bad"}`}>
                {c.result.toLowerCase()}
              </span>
            </li>
          ))}
          {certificates.length === 0 && (
            <li className="panel p-8 text-center text-sm text-travertine/60">No certificates issued yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
