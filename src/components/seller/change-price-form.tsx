"use client";

import { useActionState } from "react";
import { changePriceAction, type SellerFormState } from "@/app/(site)/actions/seller-listing-actions";

export function ChangePriceForm({ listingId, current }: { listingId: string; current: string }) {
  const [state, action, pending] = useActionState<SellerFormState, FormData>(changePriceAction, {});
  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="listingId" value={listingId} />
      <label htmlFor={`price-${listingId}`} className="sr-only">
        New price (current {current})
      </label>
      <input
        id={`price-${listingId}`}
        name="price"
        placeholder={current}
        className="input-imperial !min-h-8 !w-24 py-0.5 text-xs"
      />
      <button type="submit" disabled={pending} className="text-xs text-gold underline underline-offset-4">
        {pending ? "…" : state.ok ? "✓" : "Set"}
      </button>
      {state.error && <span role="alert" className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
