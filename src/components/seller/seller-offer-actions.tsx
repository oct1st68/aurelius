"use client";

import { useActionState, useState } from "react";
import { sellerRespondAction, type OfferActionState } from "@/app/(site)/actions/offer-actions";
import { formatMoneyInput } from "@/core/money";

interface Props {
  offerId: string;
  askingCents: number;
}

export function SellerOfferActions({ offerId, askingCents }: Props) {
  const [state, action, pending] = useActionState<OfferActionState, FormData>(sellerRespondAction, {});
  const [counterOpen, setCounterOpen] = useState(false);
  const suggested = Math.round((askingCents * 0.95) / 100);

  if (state.ok) {
    return (
      <p role="status" className="mt-3 text-sm text-emerald-400">
        {state.message}
      </p>
    );
  }

  return (
    <div className="mt-4 border-t hairline pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <form action={action}>
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="verb" value="accept" />
          <button type="submit" disabled={pending} className="btn-imperial btn-solid !min-h-9 px-4 text-[10px]">
            Accept
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="verb" value="decline" />
          <button type="submit" disabled={pending} className="btn-imperial btn-ghost !min-h-9 px-4 text-[10px]">
            Decline
          </button>
        </form>
        <button
          type="button"
          onClick={() => setCounterOpen((v) => !v)}
          className="btn-imperial !min-h-9 px-4 text-[10px]"
          aria-expanded={counterOpen}
        >
          Counter…
        </button>
      </div>
      {counterOpen && (
        <form action={action} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="verb" value="counter" />
          <label htmlFor={`counter-${offerId}`} className="label-imperial !mb-0">
            Counter (USD)
          </label>
          <input
            id={`counter-${offerId}`}
            name="counterAmount"
            required
            placeholder={formatMoneyInput({ amountCents: suggested, currency: "USD" })}
            className="input-imperial !min-h-9 !w-32 py-1 text-sm"
          />
          <button type="submit" disabled={pending} className="btn-imperial btn-solid !min-h-9 px-4 text-[10px]">
            Send
          </button>
        </form>
      )}
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}
