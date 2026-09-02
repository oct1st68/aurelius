"use server";

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/core/errors";
import { getSession } from "@/lib/auth/request-context";
import { createListing, updateListingDraft } from "@/lib/services/listing-service";
import type { CurrencyCode } from "@/core/money";
import type { Listing } from "@/domain/entities";

export interface WizardFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  listingId?: string;
  message?: string;
}

function readListingFields(formData: FormData) {
  const functions = String(formData.get("functions") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const priceRaw = String(formData.get("price") ?? "0").replace(/[,\s]/g, "");
  return {
    brandId: String(formData.get("brandId") ?? ""),
    model: String(formData.get("model") ?? ""),
    referenceNumber: String(formData.get("referenceNumber") ?? ""),
    year: Number(formData.get("year") ?? 0),
    movement: (String(formData.get("movement") ?? "Automatic") as Listing["movement"]),
    caseMaterial: String(formData.get("caseMaterial") ?? ""),
    caseDiameterMm: Number(formData.get("caseDiameterMm") ?? 0),
    dialColor: String(formData.get("dialColor") ?? ""),
    bracelet: String(formData.get("bracelet") ?? ""),
    waterResistanceM: Number(formData.get("waterResistanceM") ?? 0),
    functions,
    powerReserveHours: formData.get("powerReserveHours")
      ? Number(formData.get("powerReserveHours"))
      : null,
    conditionGrade: String(formData.get("conditionGrade") ?? "EXCELLENT") as Listing["conditionGrade"],
    conditionNotes: String(formData.get("conditionNotes") ?? ""),
    boxAndPapers: String(formData.get("boxAndPapers") ?? "NO_BOX_PAPERS") as Listing["boxAndPapers"],
    documentation: String(formData.get("documentation") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    serviceHistory: String(formData.get("serviceHistory") ?? ""),
    // Photography step: demo path uses provided media paths (upload route also exists)
    images: String(formData.get("imagePaths") ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((path, i) => ({
        id: `img_wizard_${i}_${Date.now()}`,
        path,
        alt: `Listing photo ${i + 1}`,
        width: 1200,
        height: 1500,
      })),
    priceCents: Math.round(Number(priceRaw || "0") * 100),
    currency: "USD" as CurrencyCode,
    collections: formData.getAll("collections").map(String) as Listing["collections"],
    serialNumber: String(formData.get("serialNumber") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

export async function saveListingAction(
  _prev: WizardFormState,
  formData: FormData,
): Promise<WizardFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const isDraft = formData.get("intent") === "draft";
    const listingId = formData.get("listingId") ? String(formData.get("listingId")) : null;
    const fields = readListingFields(formData);

    if (listingId) {
      await updateListingDraft(auth, listingId, fields);
      revalidatePath("/seller/listings");
      return { ok: true, listingId, message: isDraft ? "Draft saved." : "Submitted for review." };
    }
    const listing = await createListing(auth, { ...fields, sellerId: auth.user.id, isDraft });
    revalidatePath("/seller/listings");
    return {
      ok: true,
      listingId: listing.id,
      message: isDraft ? "Draft saved — resume anytime." : "Submitted for review.",
    };
  } catch (error) {
    const appError = toUserMessage(error);
    const details = (error as { details?: Record<string, string> }).details;
    return { error: appError, fieldErrors: details };
  }
}

/** Final submit: DRAFT → PENDING_REVIEW. */
export async function submitListingAction(
  _prev: WizardFormState,
  formData: FormData,
): Promise<WizardFormState> {
  try {
    const auth = await getSession();
    if (!auth) return { error: "Please sign in." };
    const listingId = String(formData.get("listingId") ?? "");
    const { transitionListing } = await import("@/lib/services/listing-service");
    await transitionListing(listingId, "PENDING_REVIEW", {
      actorId: auth.user.id,
      note: "Submitted via wizard",
    });
    revalidatePath("/seller/listings");
    return { ok: true, listingId, message: "Submitted for review." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}
