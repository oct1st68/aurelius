"use client";

import { useActionState } from "react";
import { adminModerateReviewAction, type AdminFormState } from "@/app/(site)/actions/admin-actions";
import { ConfirmSubmit } from "./confirm-submit";

interface Row {
  id: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  buyer: string;
  listing: string;
}

export function AdminReviewsClient({ rows }: { rows: Row[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(adminModerateReviewAction, {});

  return (
    <div className="mt-8 space-y-4">
      {rows.map((row) => (
        <div key={row.id} className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-gold" aria-label={`${row.rating} stars`}>
                {"★".repeat(row.rating)}
                <span className="text-travertine/25">{"★".repeat(5 - row.rating)}</span>
              </p>
              <p className="mt-1 text-ivory">{row.title}</p>
              <p className="mt-1 text-xs text-bronze">
                {row.buyer} on {row.listing}
              </p>
            </div>
            <span className={`badge ${row.status === "PUBLISHED" ? "badge-ok" : "badge-bad"}`}>
              {row.status.toLowerCase()}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-travertine/70">{row.body}</p>
          <div className="mt-4 flex gap-3 border-t hairline pt-4">
            {row.status === "PUBLISHED" ? (
              <ConfirmSubmit
                action={action}
                hidden={{ reviewId: row.id, status: "HIDDEN" }}
                label="Hide review"
                className="btn-imperial btn-burgundy !min-h-9 px-4 text-[10px]"
                danger
                confirmTitle="Hide this review?"
                confirmBody="The review will no longer be shown publicly. This action is audit-logged."
                confirmLabel="Hide"
              >
                <input type="hidden" name="reason" value="Hidden by admin console" />
              </ConfirmSubmit>
            ) : (
              <ConfirmSubmit
                action={action}
                hidden={{ reviewId: row.id, status: "PUBLISHED" }}
                label="Restore (publish)"
                confirmTitle="Publish this review again?"
                confirmBody="The review will be visible on the listing page. This action is audit-logged."
                confirmLabel="Publish"
              >
                <input type="hidden" name="reason" value="Restored by admin console" />
              </ConfirmSubmit>
            )}
            {state.error && <span role="alert" className="text-xs text-red-400">{state.error}</span>}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="panel p-10 text-center text-sm text-travertine/60">No reviews yet.</p>
      )}
    </div>
  );
}
