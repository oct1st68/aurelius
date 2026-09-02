import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { isAdmin } from "@/lib/auth/rbac";
import { listAudit } from "@/lib/services/audit-service";
import { formatTimestamp } from "@/lib/services/admin-service";

export const metadata = { title: "Admin · Audit Log" };

export default async function AdminAuditPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/admin/audit");
  if (!isAdmin(auth.user)) redirect("/account");

  const events = await listAudit(200);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Commentarii · The Record</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Audit Log</h1>
      <p className="mt-3 text-sm text-travertine/65">
        Append-only trail of security-relevant actions. Sensitive values are
        redacted at write time.
      </p>
      <div className="gold-rule mt-6" />

      <div className="mt-8 overflow-x-auto">
        <table className="table-imperial min-w-[720px]">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="whitespace-nowrap text-travertine/60">
                  {formatTimestamp(event.at)}
                </td>
                <td className="text-travertine/80">
                  {event.actorId ? event.actorId.slice(-8).toUpperCase() : "system"}
                </td>
                <td className="font-mono text-xs text-gold">{event.action}</td>
                <td className="text-travertine/60">
                  {event.targetType ? `${event.targetType} ${event.targetId?.slice(-8)}` : "—"}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-travertine/60">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
