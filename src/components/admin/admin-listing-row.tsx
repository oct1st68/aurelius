"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminModerateListingAction, type AdminFormState } from "@/app/(site)/actions/admin-actions";
import { ConfirmSubmit } from "./confirm-submit";
import { formatMoney } from "@/core/money";
import type { Listing } from "@/domain/entities";

export function AdminListingRow({ listing }: { listing: Listing }) {
  const [state, action] = useActionState<AdminFormState, FormData>(adminModerateListingAction, {});
  const image = listing.images[0];

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center gap-4">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${image.path}`} alt="" className="h-20 w-16 border border-gold/15 object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/watches/${listing.slug}`} className="font-serif-lux block truncate text-lg text-ivory hover:text-gold">
            {listing.model}
          </Link>
          <p className="text-xs text-bronze">
            Ref. {listing.referenceNumber} · {formatMoney(listing.price)} · {listing.conditionGrade}
          </p>
          {listing.moderationNote && (
            <p className="mt-1 text-xs text-red-400/80">Note: {listing.moderationNote}</p>
          )}
        </div>
        <span
          className={`badge ${
            listing.status === "PUBLISHED" || listing.status === "APPROVED"
              ? "badge-ok"
              : listing.status === "PENDING_REVIEW" || listing.status === "CHANGES_REQUESTED"
                ? "badge-warn"
                : "badge-bad"
          }`}
        >
          {listing.status.replace(/_/g, " ").toLowerCase()}
        </span>
      </div>

      {listing.status === "PENDING_REVIEW" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t hairline pt-4">
          <ConfirmSubmit
            action={action}
            hidden={{ listingId: listing.id, to: "APPROVED" }}
            label="Approve"
            confirmTitle="Approve this listing?"
            confirmBody="The listing becomes eligible for publication. This action is audit-logged."
            confirmLabel="Approve"
          >
            <input type="hidden" name="reason" value="Approved by admin moderation" />
          </ConfirmSubmit>
          <ConfirmSubmit
            action={action}
            hidden={{ listingId: listing.id, to: "CHANGES_REQUESTED" }}
            label="Request changes"
            className="btn-imperial btn-ghost !min-h-9 px-4 text-[10px]"
            confirmTitle="Request changes?"
            confirmBody="The seller will be asked to revise and resubmit. This action is audit-logged."
            confirmLabel="Request changes"
          >
            <input type="hidden" name="reason" value="Changes requested by admin moderation" />
          </ConfirmSubmit>
          {state.error && <span role="alert" className="text-xs text-red-400">{state.error}</span>}
          {state.ok && <span className="text-xs text-emerald-400">{state.message}</span>}
        </div>
      )}

      {listing.status === "APPROVED" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t hairline pt-4">
          <ConfirmSubmit
            action={action}
            hidden={{ listingId: listing.id, to: "PUBLISHED" }}
            label="Publish"
            confirmTitle="Publish this listing?"
            confirmBody="The listing will appear in the public catalog immediately. This action is audit-logged."
            confirmLabel="Publish"
          >
            <input type="hidden" name="reason" value="Published by admin moderation" />
          </ConfirmSubmit>
          {state.error && <span role="alert" className="text-xs text-red-400">{state.error}</span>}
          {state.ok && <span className="text-xs text-emerald-400">{state.message}</span>}
        </div>
      )}

      {listing.status === "PUBLISHED" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t hairline pt-4">
          <ConfirmSubmit
            action={action}
            hidden={{ listingId: listing.id, to: "ARCHIVED" }}
            label="Archive (delist)"
            className="btn-imperial btn-burgundy !min-h-9 px-4 text-[10px]"
            danger
            confirmTitle="Archive this listing?"
            confirmBody="The listing will be removed from the public catalog. This action is audit-logged."
            confirmLabel="Archive"
          >
            <input type="hidden" name="reason" value="Archived by admin moderation" />
          </ConfirmSubmit>
          {state.error && <span role="alert" className="text-xs text-red-400">{state.error}</span>}
          {state.ok && <span className="text-xs text-emerald-400">{state.message}</span>}
        </div>
      )}
    </div>
  );
}
