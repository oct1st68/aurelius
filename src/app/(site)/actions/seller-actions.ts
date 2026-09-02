"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/request-context";
import { repos } from "@/data/repositories";

/**
 * Self-service seller upgrade (localhost demo path). In production this would
 * enter a verification queue handled by admins (verifySeller in admin-service).
 */
export async function becomeSellerAction(): Promise<void> {
  const auth = await getSession();
  if (!auth) return;
  if (auth.user.roles.includes("SELLER")) return;
  const roles = [...auth.user.roles, "SELLER"] as typeof auth.user.roles;
  await repos().users.update(auth.user.id, { roles });
  revalidatePath("/seller/dashboard");
  revalidatePath("/");
}
