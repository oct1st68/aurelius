"use client";

import { useActionState } from "react";
import { Bookmark, Plus, Check } from "lucide-react";
import {
  addToCartAction,
  saveToVaultAction,
  type ActionState,
} from "@/app/(site)/actions/commerce-actions";

const INITIAL: ActionState = {};

export function CartButtons({ listingId, slug }: { listingId: string; slug: string }) {
  const [state, action, pending] = useActionState(addToCartAction, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="slug" value={`/watches/${slug}`} />
      <button
        type="submit"
        disabled={pending}
        className="flex h-9 w-9 items-center justify-center border border-gold/30 text-travertine/70 transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
        aria-label={state.ok ? "Added to cart" : "Add to cart"}
        title={state.error ?? "Add to cart"}
      >
        {state.ok ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
      {state.error && (
        <span role="alert" className="sr-only">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function VaultButton({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(saveToVaultAction, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={pending}
        className="flex h-9 w-9 items-center justify-center border border-gold/30 text-travertine/70 transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
        aria-label={state.ok ? "Saved to Vault" : "Save to Vault"}
        title={state.error ?? "Save to Vault"}
      >
        <Bookmark className={`h-4 w-4 ${state.ok ? "fill-gold text-gold" : ""}`} />
      </button>
      {state.error && (
        <span role="alert" className="sr-only">
          {state.error}
        </span>
      )}
    </form>
  );
}
