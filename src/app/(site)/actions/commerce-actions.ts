"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toUserMessage } from "@/core/errors";
import { getSession } from "@/lib/auth/request-context";
import { addToCart, removeFromCart, saveToVault, removeFromVault } from "@/lib/services/cart-service";

export interface ActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

function toState(error: unknown): ActionState {
  return { error: toUserMessage(error), ok: false };
}

export async function addToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const auth = await getSession();
    if (!auth) redirect(`/login?redirectTo=/cart`);
    const listingId = String(formData.get("listingId") ?? "");
    await addToCart(auth, listingId);
    revalidatePath("/cart");
    return { ok: true, message: "Added to cart" };
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return toState(error);
  }
}

export async function removeFromCartAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const auth = await getSession();
    if (!auth) redirect("/login?redirectTo=/cart");
    const listingId = String(formData.get("listingId") ?? "");
    await removeFromCart(auth, listingId);
    revalidatePath("/cart");
    return { ok: true, message: "Removed" };
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return toState(error);
  }
}

export async function saveToVaultAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const auth = await getSession();
    if (!auth) redirect("/login?redirectTo=/vault");
    const listingId = String(formData.get("listingId") ?? "");
    const note = formData.get("note") ? String(formData.get("note")) : undefined;
    await saveToVault(auth, listingId, note);
    revalidatePath("/vault");
    return { ok: true, message: "Saved to Vault" };
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return toState(error);
  }
}

export async function removeFromVaultAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const auth = await getSession();
    if (!auth) redirect("/login?redirectTo=/vault");
    const listingId = String(formData.get("listingId") ?? "");
    await removeFromVault(auth, listingId);
    revalidatePath("/vault");
    return { ok: true, message: "Removed from Vault" };
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return toState(error);
  }
}
