"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/core/errors";
import { getSession } from "@/lib/auth/request-context";
import {
  setUserStatus,
  setUserRoles,
  moderateListing,
  verifySeller,
  refundOrder,
} from "@/lib/services/admin-service";
import { setReviewStatus } from "@/lib/services/review-service";
import { revokeCertificate } from "@/lib/services/certificate-service";
import type { Role } from "@/domain/enums";

export interface AdminFormState {
  error?: string;
  ok?: boolean;
  message?: string;
}

/** All admin actions re-verify the ADMIN role server-side and are audit-logged. */

export async function adminSetUserStatusAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const userId = String(formData.get("userId") ?? "");
    const status = String(formData.get("status") ?? "ACTIVE") as "ACTIVE" | "BANNED";
    const reason = String(formData.get("reason") ?? "");
    await setUserStatus(auth, userId, status, reason);
    revalidatePath("/admin/users");
    return { ok: true, message: `User ${status.toLowerCase()}.` };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function adminSetUserRolesAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const userId = String(formData.get("userId") ?? "");
    const roles = formData.getAll("roles").map(String) as Role[];
    const reason = String(formData.get("reason") ?? "");
    await setUserRoles(auth, userId, roles, reason);
    revalidatePath("/admin/users");
    return { ok: true, message: "Roles updated." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function adminModerateListingAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const listingId = String(formData.get("listingId") ?? "");
    const to = String(formData.get("to") ?? "") as "APPROVED" | "CHANGES_REQUESTED" | "PUBLISHED" | "ARCHIVED";
    const reason = String(formData.get("reason") ?? "");
    await moderateListing(auth, listingId, to, reason);
    revalidatePath("/admin/listings");
    return { ok: true, message: `Listing ${to.replace(/_/g, " ").toLowerCase()}.` };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function adminVerifySellerAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const sellerId = String(formData.get("sellerId") ?? "");
    const status = String(formData.get("status") ?? "VERIFIED") as "VERIFIED" | "REJECTED" | "PENDING";
    const reason = String(formData.get("reason") ?? "");
    await verifySeller(auth, sellerId, status, reason);
    revalidatePath("/admin/users");
    return { ok: true, message: `Seller ${status.toLowerCase()}.` };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function adminRefundAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const paymentId = String(formData.get("paymentId") ?? "");
    const amountRaw = String(formData.get("amount") ?? "").trim();
    const reason = String(formData.get("reason") ?? "");
    const amountCents = amountRaw ? Math.round(Number(amountRaw.replace(/[,\s]/g, "")) * 100) : null;
    await refundOrder(auth, paymentId, amountCents, reason);
    revalidatePath("/admin/orders");
    return { ok: true, message: "Refund processed." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function adminModerateReviewAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const reviewId = String(formData.get("reviewId") ?? "");
    const status = String(formData.get("status") ?? "HIDDEN") as "PUBLISHED" | "HIDDEN";
    const reason = String(formData.get("reason") ?? "");
    await setReviewStatus(auth, reviewId, status, reason);
    revalidatePath("/admin/reviews");
    return { ok: true, message: `Review ${status.toLowerCase()}.` };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function adminRevokeCertificateAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const certificateId = String(formData.get("certificateId") ?? "");
    const reason = String(formData.get("reason") ?? "");
    await revokeCertificate(auth, certificateId, reason);
    revalidatePath("/admin/certificates");
    return { ok: true, message: "Certificate revoked." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}
