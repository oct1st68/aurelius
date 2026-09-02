"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/core/errors";
import { getSession } from "@/lib/auth/request-context";
import { markAllRead, markRead } from "@/lib/services/notification-service";

export async function markAllReadAction(): Promise<void> {
  const auth = await getSession();
  if (!auth) return;
  await markAllRead(auth.user.id);
  revalidatePath("/account/notifications");
}

export async function markReadAction(formData: FormData): Promise<void> {
  const auth = await getSession();
  if (!auth) return;
  const id = String(formData.get("notificationId") ?? "");
  try {
    await markRead(auth.user.id, id);
  } catch (error) {
    console.error("[notification] markRead failed:", toUserMessage(error));
  }
  revalidatePath("/account/notifications");
}
