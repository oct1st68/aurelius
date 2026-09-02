"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/core/errors";
import { getSession } from "@/lib/auth/request-context";
import { transitionOrder } from "@/lib/services/order-service";
import type { OrderStatus } from "@/domain/enums";

export interface OrderActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export async function orderTransitionAction(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const orderId = String(formData.get("orderId") ?? "");
    const to = String(formData.get("to") ?? "") as OrderStatus;
    const note = String(formData.get("note") ?? "Status updated");
    await transitionOrder({ orderId, to, actor: auth, note });
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/account/orders");
    return { ok: true, message: `Order moved to ${to.replace(/_/g, " ").toLowerCase()}.` };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}
