"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/core/errors";
import { getSession } from "@/lib/auth/request-context";
import { transitionListing, changePrice } from "@/lib/services/listing-service";

export interface SellerFormState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export async function submitForReviewAction(
  _prev: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const listingId = String(formData.get("listingId") ?? "");
    const listing = await repos_getListing(listingId);
    const from = listing?.status ?? "DRAFT";
    await transitionListing(listingId, "PENDING_REVIEW", {
      actorId: auth.user.id,
      actorIsSeller: true,
      note: "Submitted by seller",
    });
    void from;
    revalidatePath("/seller/listings");
    return { ok: true, message: "Submitted for review." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

async function repos_getListing(listingId: string) {
  const { repos } = await import("@/data/repositories");
  return repos().listings.find((l) => l.id === listingId);
}

export async function changePriceAction(
  _prev: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const listingId = String(formData.get("listingId") ?? "");
    const raw = String(formData.get("price") ?? "0");
    const { parseMoneyInput } = await import("@/core/money");
    const money = parseMoneyInput(raw, "USD");
    await changePrice(auth, listingId, money.amountCents, money.currency);
    revalidatePath("/seller/listings");
    return { ok: true, message: "Price updated." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}
