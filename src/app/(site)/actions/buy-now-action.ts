"use server";

import { redirect } from "next/navigation";
import { toUserMessage } from "@/core/errors";
import { getSession } from "@/lib/auth/request-context";
import { createDirectOrder } from "@/lib/services/checkout-service";

/**
 * Buy Now — called from a client form. Creates the order (reserving the watch)
 * and redirects to checkout. Redirects count as success; errors are surfaced
 * via the redirect query param.
 */
export async function buyNowServerAction(formData: FormData): Promise<void> {
  let slug = "/watches";
  try {
    const auth = await getSession();
    if (!auth) redirect("/login?redirectTo=/cart");
    const listingId = String(formData.get("listingId") ?? "");
    slug = String(formData.get("slug") ?? "/watches");
    const order = await createDirectOrder(auth, listingId);
    redirect(`/checkout/${order.id}`);
  } catch (error) {
    const digest = (error as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
    redirect(`${slug}?error=${encodeURIComponent(toUserMessage(error))}`);
  }
}
