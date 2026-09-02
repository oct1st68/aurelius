"use client";

import { useActionState } from "react";
import { createReviewAction, type ReviewActionState } from "@/app/(site)/actions/review-actions";

export function ReviewForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<ReviewActionState, FormData>(createReviewAction, {});

  if (state.ok) {
    return (
      <p role="status" className="mt-4 text-sm text-emerald-400">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="panel mt-4 space-y-4 p-6">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex gap-2" role="radiogroup" aria-label="Rating">
        {[5, 4, 3, 2, 1].map((n) => (
          <label key={n} className="cursor-pointer text-2xl text-gold/40 has-checked:text-gold">
            <input type="radio" name="rating" value={n} defaultChecked={n === 5} className="sr-only" />
            <span aria-hidden>★</span>
            <span className="sr-only">{n} star{n === 1 ? "" : "s"}</span>
          </label>
        ))}
      </div>
      <div>
        <label htmlFor="review-title" className="label-imperial">
          Title
        </label>
        <input id="review-title" name="title" required minLength={4} maxLength={80} className="input-imperial" />
      </div>
      <div>
        <label htmlFor="review-body" className="label-imperial">
          Your experience
        </label>
        <textarea id="review-body" name="body" required minLength={20} maxLength={2000} rows={4} className="input-imperial py-2" />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-imperial btn-solid w-full">
        {pending ? "Sealing…" : "Publish Review"}
      </button>
    </form>
  );
}
