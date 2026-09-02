/**
 * AURELIUS CERTIFIED — authenticator inspection workflow + public certificates.
 * Certification actions are restricted to AUTHENTICATOR/ADMIN and audit-logged.
 */

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/core/errors";
import { nowIso } from "@/core/time";
import type { Certificate, Inspection, Order } from "@/domain/entities";
import type { OrderStatus } from "@/domain/enums";
import { repos } from "@/data/repositories";
import { withLocks } from "@/data/store/lock";
import { isAdmin, type SessionWithUser } from "@/lib/auth/rbac";
import { maskSerial } from "@/lib/auth/tokens";
import { getListingById } from "./listing-service";
import { transitionOrder } from "./order-service";
import { audit } from "./audit-service";
import { notify } from "./notification-service";

function assertAuthenticator(auth: SessionWithUser): void {
  if (!auth.user.roles.includes("AUTHENTICATOR") && !isAdmin(auth.user)) {
    throw new ForbiddenError("Only authenticators may perform inspections.");
  }
}

export async function queueInspection(orderId: string): Promise<Inspection> {
  const existing = await repos().inspections.find((i) => i.orderId === orderId);
  if (existing) return existing; // idempotent
  const order = await repos().orders.find((o) => o.id === orderId);
  if (!order) throw new NotFoundError("Order not found");
  return repos().inspections.create({
    orderId,
    listingId: order.listingId,
    assignedTo: null,
    status: "QUEUED",
    outcomeNotes: null,
    checklist: { movement: false, authenticity: false, condition: false, timekeeping: false },
    completedAt: null,
  });
}

export async function listInspections(): Promise<Inspection[]> {
  const rows = await repos().inspections.list();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getInspection(id: string): Promise<Inspection> {
  const inspection = await repos().inspections.find((i) => i.id === id);
  if (!inspection) throw new NotFoundError("Inspection not found");
  return inspection;
}

export async function claimInspection(
  auth: SessionWithUser,
  inspectionId: string,
): Promise<Inspection> {
  assertAuthenticator(auth);
  return repos().inspections.mutate(inspectionId, (i) => {
    if (i.status !== "QUEUED") throw new ConflictError("Inspection already claimed");
    return { ...i, assignedTo: auth.user.id, status: "IN_PROGRESS" };
  });
}

export interface InspectionResultInput {
  inspectionId: string;
  outcome: "APPROVED" | "REJECTED" | "ADDITIONAL_REVIEW";
  checklist: Inspection["checklist"];
  notes: string;
}

/**
 * Record the inspection outcome.
 *  APPROVED           → order AUTHENTICATING→AUTHENTICATED, certificate issued
 *  REJECTED           → order → AUTHENTICATION_FAILED (refund flow next)
 *  ADDITIONAL_REVIEW  → stays AUTHENTICATING, notes recorded
 */
export async function recordInspection(
  auth: SessionWithUser,
  input: InspectionResultInput,
): Promise<{ inspection: Inspection; certificate: Certificate | null; order: Order }> {
  assertAuthenticator(auth);
  if (input.notes.trim().length < 10) {
    throw new ValidationError("Inspection notes are required (min 10 characters).");
  }
  return withLocks(["collection:inspections", "collection:orders", "collection:certificates"], async () => {
    const inspection = await repos().inspections.find((i) => i.id === input.inspectionId);
    if (!inspection) throw new NotFoundError("Inspection not found");
    if (inspection.assignedTo && inspection.assignedTo !== auth.user.id && !isAdmin(auth.user)) {
      throw new ForbiddenError("This inspection is claimed by another authenticator.");
    }
    if (inspection.status === "APPROVED" || inspection.status === "REJECTED") {
      throw new ConflictError("Inspection already concluded.");
    }

    const order = await repos().orders.find((o) => o.id === inspection.orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== "SHIPPED_TO_AUTHENTICATOR" && order.status !== "AUTHENTICATING") {
      throw new ConflictError(`Order status ${order.status} cannot be inspected.`);
    }

    const completed: Inspection = {
      ...inspection,
      assignedTo: auth.user.id,
      status: input.outcome,
      checklist: input.checklist,
      outcomeNotes: input.notes.trim(),
      completedAt: nowIso(),
    };
    await repos().inspections.update(inspection.id, {
      assignedTo: completed.assignedTo,
      status: completed.status,
      checklist: completed.checklist,
      outcomeNotes: completed.outcomeNotes,
      completedAt: completed.completedAt,
    });

    let certificate: Certificate | null = null;
    let orderStatus: OrderStatus = order.status;

    if (input.outcome === "APPROVED") {
      // Advance the order: SHIPPED_TO_AUTHENTICATOR→AUTHENTICATING→AUTHENTICATED
      if (orderStatus === "SHIPPED_TO_AUTHENTICATOR") {
        orderStatus = (
          await transitionOrder({
            orderId: order.id,
            to: "AUTHENTICATING",
            actor: auth,
            note: "Inspection started",
          })
        ).status;
      }
      orderStatus = (
        await transitionOrder({
          orderId: order.id,
          to: "AUTHENTICATED",
          actor: auth,
          note: `Authenticity confirmed by ${auth.user.displayName}`,
        })
      ).status;

      certificate = await issueCertificate(auth, order);
    } else if (input.outcome === "REJECTED") {
      if (orderStatus === "SHIPPED_TO_AUTHENTICATOR") {
        orderStatus = (
          await transitionOrder({
            orderId: order.id,
            to: "AUTHENTICATING",
            actor: auth,
            note: "Inspection started",
          })
        ).status;
      }
      orderStatus = (
        await transitionOrder({
          orderId: order.id,
          to: "AUTHENTICATION_FAILED",
          actor: auth,
          note: `Authenticity rejected: ${input.notes.trim().slice(0, 120)}`,
        })
      ).status;
      await notify({
        userId: order.buyerId,
        type: "AUTHENTICATION_FAILED",
        title: "Authentication failed",
        body: `Order ${order.id} failed authentication. A refund will be processed.`,
        link: `/orders/${order.id}`,
        dedupeKey: `order:${order.id}:AUTH_FAILED`,
      });
    } else {
      // ADDITIONAL_REVIEW keeps the order in AUTHENTICATING.
      if (orderStatus === "SHIPPED_TO_AUTHENTICATOR") {
        orderStatus = (
          await transitionOrder({
            orderId: order.id,
            to: "AUTHENTICATING",
            actor: auth,
            note: "Inspection started",
          })
        ).status;
      }
      await notify({
        userId: order.sellerId,
        type: "ORDER_UPDATED",
        title: "Additional review requested",
        body: `The authenticator requested additional review for order ${order.id}.`,
        link: `/seller/orders/${order.id}`,
        dedupeKey: `order:${order.id}:ADDITIONAL_REVIEW`,
      });
    }

    return { inspection: completed, certificate, order: { ...order, status: orderStatus } };
  });
}

async function issueCertificate(auth: SessionWithUser, order: Order): Promise<Certificate> {
  const existing = await repos().certificates.find((c) => c.orderId === order.id);
  if (existing) return existing;
  const listing = await getListingById(order.listingId);
  const seq = await nextCertificateSequence();
  const cert = await repos().certificates.create({
    certificateNumber: `AUR-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`,
    listingId: order.listingId,
    orderId: order.id,
    issuedBy: auth.user.id,
    result: "AUTHENTICATED",
    serialMasked: maskSerial(listing.serialNumber),
    notes: "Verified against house records, movement, dial, and case geometry.",
    issuedAt: nowIso(),
  });
  await repos().orders.update(order.id, { certificateId: cert.id });
  await notify({
    userId: order.buyerId,
    type: "AUTHENTICATION_PASSED",
    title: "AURELIUS Certified",
    body: `Certificate ${cert.certificateNumber} issued for your order.`,
    link: `/certificate/${cert.certificateNumber}`,
    dedupeKey: `cert:${cert.id}:buyer`,
  });
  await audit({
    actorType: "user",
    actorId: auth.user.id,
    action: "certificate.issued",
    targetType: "certificate",
    targetId: cert.id,
    meta: { orderId: order.id, listingId: order.listingId },
  });
  return cert;
}

/** Monotonic sequence from the certificates collection length (demo-grade). */
async function nextCertificateSequence(): Promise<number> {
  const rows = await repos().certificates.list();
  return rows.length + 1;
}

export async function getCertificateByNumber(
  certificateNumber: string,
): Promise<Certificate> {
  const cert = await repos().certificates.find(
    (c) => c.certificateNumber === certificateNumber.toUpperCase(),
  );
  if (!cert) throw new NotFoundError("Certificate not found");
  return cert;
}

export async function revokeCertificate(
  auth: SessionWithUser,
  certificateId: string,
  reason: string,
): Promise<Certificate> {
  assertAuthenticator(auth);
  if (reason.trim().length < 8) {
    throw new ValidationError("Revocation reason required (min 8 characters).");
  }
  const updated = await repos().certificates.mutate(certificateId, (c) => {
    if (c.result === "REVOKED") return null;
    return { ...c, result: "REVOKED" };
  });
  if (!updated) throw new ConflictError("Certificate already revoked");
  await audit({
    actorType: "user",
    actorId: auth.user.id,
    action: "certificate.revoked",
    targetType: "certificate",
    targetId: certificateId,
    meta: { reason },
  });
  return updated;
}
