"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/core/errors";
import { enforceRateLimit } from "@/core/rate-limit";
import { getSession } from "@/lib/auth/request-context";
import { createReview } from "@/lib/services/review-service";

export interface ReviewActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export async function createReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    enforceRateLimit("review", auth.user.id);
    const orderId = String(formData.get("orderId") ?? "");
    const rating = Number(formData.get("rating") ?? 5);
    const title = String(formData.get("title") ?? "");
    const body = String(formData.get("body") ?? "");
    if (!(rating >= 1 && rating <= 5)) return { error: "Rating must be 1–5." };
    await createReview(auth, {
      orderId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      title,
      body,
    });
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, message: "Review published. The empire thanks you." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}
