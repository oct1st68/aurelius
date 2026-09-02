import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { isAdmin } from "@/lib/auth/rbac";
import { repos } from "@/data/repositories";
import { AdminCertificatesClient } from "@/components/admin/admin-certificates-client";

export const metadata = { title: "Admin · Certificates" };

export default async function AdminCertificatesPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/admin/certificates");
  if (!isAdmin(auth.user)) redirect("/account");

  const certs = (await repos().certificates.list()).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Sigillum · The Imperial Seal</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Certificates</h1>
      <div className="gold-rule mt-6" />
      <AdminCertificatesClient
        certs={certs.map((c) => ({
          id: c.id,
          certificateNumber: c.certificateNumber,
          result: c.result,
          issuedAt: c.issuedAt,
          listingId: c.listingId,
        }))}
      />
    </div>
  );
}
