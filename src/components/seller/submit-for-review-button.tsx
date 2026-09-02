"use client";

import { useActionState } from "react";
import { submitForReviewAction, type SellerFormState } from "@/app/(site)/actions/seller-listing-actions";

export function SubmitForReviewButton({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<SellerFormState, FormData>(submitForReviewAction, {});
  return (
    <form action={action} className="inline">
      <input type="hidden" name="listingId" value={listingId} />
      <button type="submit" disabled={pending} className="text-xs text-gold underline underline-offset-4">
        {pending ? "…" : state.ok ? "Submitted ✓" : "Submit for review"}
      </button>
      {state.error && <span role="alert" className="ml-2 text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
