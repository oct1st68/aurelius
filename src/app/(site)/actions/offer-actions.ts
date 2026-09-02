"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/core/errors";
import { enforceRateLimit } from "@/core/rate-limit";
import { getSession } from "@/lib/auth/request-context";
import {
  createOffer,
  sellerAcceptOffer,
  sellerCounterOffer,
  sellerDeclineOffer,
  buyerCancelOffer,
  buyerAcceptCounter,
} from "@/lib/services/offer-service";

export interface OfferActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

function fail(error: unknown): OfferActionState {
  return { error: toUserMessage(error) };
}

export async function createOfferAction(
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in to make an offer." };
    enforceRateLimit("offer", auth.user.id);
    const listingId = String(formData.get("listingId") ?? "");
    const amount = String(formData.get("amount") ?? "0");
    const message = String(formData.get("message") ?? "");
    const { parseMoneyInput } = await import("@/core/money");
    const money = parseMoneyInput(amount, "USD");
    await createOffer(auth, {
      listingId,
      amountCents: money.amountCents,
      currency: money.currency,
      message: message || undefined,
    });
    revalidatePath("/account/offers");
    return { ok: true, message: "Offer sent to the seller." };
  } catch (error) {
    return fail(error);
  }
}

export async function sellerRespondAction(
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const offerId = String(formData.get("offerId") ?? "");
    const verb = String(formData.get("verb") ?? "");
    if (verb === "accept") {
      await sellerAcceptOffer(auth, offerId);
      revalidatePath("/seller/offers");
      return { ok: true, message: "Offer accepted — order created. The watch is reserved." };
    }
    if (verb === "decline") {
      await sellerDeclineOffer(auth, offerId);
      revalidatePath("/seller/offers");
      return { ok: true, message: "Offer declined." };
    }
    if (verb === "counter") {
      const { parseMoneyInput } = await import("@/core/money");
      const counter = parseMoneyInput(String(formData.get("counterAmount") ?? "0"), "USD");
      await sellerCounterOffer(auth, offerId, counter.amountCents, counter.currency);
      revalidatePath("/seller/offers");
      return { ok: true, message: "Counter-offer sent." };
    }
    return { error: "Unknown action." };
  } catch (error) {
    return fail(error);
  }
}

export async function buyerOfferAction(
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const offerId = String(formData.get("offerId") ?? "");
    const verb = String(formData.get("verb") ?? "");
    if (verb === "cancel") {
      await buyerCancelOffer(auth, offerId);
      revalidatePath("/account/offers");
      return { ok: true, message: "Offer cancelled." };
    }
    if (verb === "accept-counter") {
      await buyerAcceptCounter(auth, offerId);
      revalidatePath("/account/offers");
      return { ok: true, message: "Counter-offer accepted — complete checkout." };
    }
    return { error: "Unknown action." };
  } catch (error) {
    return fail(error);
  }
}

