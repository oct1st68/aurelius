"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { removeFromCartAction, type ActionState } from "@/app/(site)/actions/commerce-actions";

export function CartLineButtons({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(removeFromCartAction, {});
  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 text-xs text-bronze transition-colors hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Remove
      </button>
      {state.error && <span role="alert" className="sr-only">{state.error}</span>}
    </form>
  );
}
