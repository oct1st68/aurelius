"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buyerOfferAction, type OfferActionState } from "@/app/(site)/actions/offer-actions";
import type { OfferStatus } from "@/domain/enums";

interface Props {
  offerId: string;
  status: OfferStatus;
  orderId: string | null;
}

export function BuyerOfferActions({ offerId, status, orderId }: Props) {
  const [state, action, pending] = useActionState<OfferActionState, FormData>(buyerOfferAction, {});

  if (state.ok && orderId) {
    return (
      <Link href={`/checkout/${orderId}`} className="btn-imperial btn-solid !min-h-9 px-4 text-[10px]">
        Complete checkout →
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === "PENDING" && (
        <form action={action}>
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="verb" value="cancel" />
          <button type="submit" disabled={pending} className="text-xs text-bronze hover:text-red-400">
            {pending ? "…" : "Cancel"}
          </button>
        </form>
      )}
      {status === "COUNTERED" && orderId === null && (
        <p className="text-xs text-bronze">Awaiting your counter response</p>
      )}
      {state.error && (
        <span role="alert" className="text-xs text-red-400">
          {state.error}
        </span>
      )}
    </div>
  );
}
