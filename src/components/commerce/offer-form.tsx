"use client";

import { useActionState } from "react";
import { HandCoins } from "lucide-react";
import { createOfferAction, type OfferActionState } from "@/app/(site)/actions/offer-actions";
import { formatMoneyInput } from "@/core/money";

interface Props {
  listingId: string;
  currency: string;
  askingCents: number;
}

export function OfferForm({ listingId, currency, askingCents }: Props) {
  const [state, action, pending] = useActionState<OfferActionState, FormData>(createOfferAction, {});
  const suggested = Math.round((askingCents * 0.9) / 100);

  if (state.ok) {
    return (
      <p role="status" className="mt-4 text-sm text-emerald-400">
        {state.message} Track it in{" "}
        <a href="/account/offers" className="text-gold underline underline-offset-4">
          your offers
        </a>
        .
      </p>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <label htmlFor="offer-amount" className="label-imperial">
          Your offer ({currency})
        </label>
        <input
          id="offer-amount"
          name="amount"
          inputMode="decimal"
          required
          placeholder={formatMoneyInput({ amountCents: suggested, currency: "USD" })}
          className="input-imperial"
        />
        <p className="mt-1.5 text-xs text-bronze">
          Asking {formatMoneyInput({ amountCents: askingCents, currency: "USD" })} — offers at or
          above asking should use Buy Now.
        </p>
      </div>
      <div>
        <label htmlFor="offer-message" className="label-imperial">
          Message (optional)
        </label>
        <textarea
          id="offer-message"
          name="message"
          rows={2}
          maxLength={500}
          placeholder="A word to the seller…"
          className="input-imperial py-2"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-imperial w-full">
        <HandCoins className="h-4 w-4" aria-hidden />
        {pending ? "Sending…" : "Send Offer"}
      </button>
    </form>
  );
}
