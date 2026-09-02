"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/core/errors";
import { getSession } from "@/lib/auth/request-context";
import {
  claimInspection,
  recordInspection,
} from "@/lib/services/certificate-service";
import { transitionOrder } from "@/lib/services/order-service";
import type { Inspection } from "@/domain/entities";

export interface InspectionFormState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export async function claimInspectionAction(
  _prev: InspectionFormState,
  formData: FormData,
): Promise<InspectionFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const id = String(formData.get("inspectionId") ?? "");
    await claimInspection(auth, id);
    revalidatePath("/authenticator");
    return { ok: true, message: "Inspection claimed." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function recordInspectionAction(
  _prev: InspectionFormState,
  formData: FormData,
): Promise<InspectionFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const inspectionId = String(formData.get("inspectionId") ?? "");
    const outcome = String(formData.get("outcome") ?? "APPROVED") as Inspection["status"];
    if (outcome !== "APPROVED" && outcome !== "REJECTED" && outcome !== "ADDITIONAL_REVIEW") {
      return { error: "Invalid outcome." };
    }
    const notes = String(formData.get("notes") ?? "");
    const checklist = {
      movement: formData.get("movement") === "on",
      authenticity: formData.get("authenticity") === "on",
      condition: formData.get("condition") === "on",
      timekeeping: formData.get("timekeeping") === "on",
    };
    const result = await recordInspection(auth, {
      inspectionId,
      outcome,
      checklist,
      notes,
    });
    revalidatePath("/authenticator");
    revalidatePath(`/orders/${result.order.id}`);
    if (outcome === "APPROVED") {
      // After authentication the seller ships to the buyer (seller action),
      // but for flow convenience the certificate number is surfaced here.
      const certNumber = result.certificate?.certificateNumber;
      return {
        ok: true,
        message: certNumber
          ? `Authenticity confirmed — certificate ${certNumber} issued.`
          : "Authenticity confirmed.",
      };
    }
    return { ok: true, message: `Outcome recorded: ${outcome.replace(/_/g, " ").toLowerCase()}.` };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

/** System convenience: begin inspection stage (SHIPPED_TO_AUTHENTICATOR → AUTHENTICATING). */
export async function beginInspectionAction(
  _prev: InspectionFormState,
  formData: FormData,
): Promise<InspectionFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const orderId = String(formData.get("orderId") ?? "");
    await transitionOrder({
      orderId,
      to: "AUTHENTICATING",
      actor: auth,
      note: "Inspection started by authenticator",
    });
    revalidatePath("/authenticator");
    return { ok: true, message: "Inspection started." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}
