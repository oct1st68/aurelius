"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminRevokeCertificateAction, type AdminFormState } from "@/app/(site)/actions/admin-actions";
import { ConfirmSubmit } from "./confirm-submit";

interface CertRow {
  id: string;
  certificateNumber: string;
  result: string;
  issuedAt: string;
  listingId: string;
}

export function AdminCertificatesClient({ certs }: { certs: CertRow[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(adminRevokeCertificateAction, {});

  return (
    <div className="mt-8 space-y-4">
      {certs.map((cert) => (
        <div key={cert.id} className="panel flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <Link href={`/certificate?number=${cert.certificateNumber}`} className="font-display text-sm tracking-wider text-gold underline underline-offset-4">
              {cert.certificateNumber}
            </Link>
            <p className="mt-1 text-xs text-bronze">
              Issued {new Date(cert.issuedAt).toLocaleDateString("en-US")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${cert.result === "AUTHENTICATED" ? "badge-ok" : "badge-bad"}`}>
              {cert.result.toLowerCase()}
            </span>
            {cert.result === "AUTHENTICATED" && (
              <ConfirmSubmit
                action={action}
                hidden={{ certificateId: cert.id }}
                label="Revoke"
                className="btn-imperial btn-burgundy !min-h-9 px-4 text-[10px]"
                danger
                confirmTitle="Revoke this certificate?"
                confirmBody="The public certificate page will show REVOKED. This action is audit-logged and requires a reason."
                confirmLabel="Revoke certificate"
              >
                <input type="hidden" name="reason" value="Revoked by admin console" />
              </ConfirmSubmit>
            )}
          </div>
        </div>
      ))}
      {certs.length === 0 && (
        <p className="panel p-10 text-center text-sm text-travertine/60">No certificates issued yet.</p>
      )}
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
    </div>
  );
}
