"use client";

import { useActionState } from "react";
import { orderTransitionAction, type OrderActionState } from "@/app/(site)/actions/order-actions";
import type { OrderStatus } from "@/domain/enums";

interface Props {
  orderId: string;
  status: OrderStatus;
  isBuyer: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  isAuthenticator: boolean;
}

const SELLER_STEPS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PAYMENT_SECURED: { to: "SELLER_PREPARING", label: "Start preparing" },
  SELLER_PREPARING: { to: "SHIPPED_TO_AUTHENTICATOR", label: "Ship to authenticator" },
  AUTHENTICATED: { to: "SHIPPED_TO_BUYER", label: "Ship to buyer" },
};

const AUTHENTICATOR_STEPS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  SHIPPED_TO_AUTHENTICATOR: { to: "AUTHENTICATING", label: "Begin inspection" },
};

const BUYER_STEPS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  DELIVERED: { to: "COMPLETED", label: "Confirm completion" },
};

const ADMIN_STEPS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PAYMENT_SECURED: { to: "SELLER_PREPARING", label: "Force: seller preparing" },
  SELLER_PREPARING: { to: "SHIPPED_TO_AUTHENTICATOR", label: "Force: ship to authenticator" },
  AUTHENTICATED: { to: "SHIPPED_TO_BUYER", label: "Force: ship to buyer" },
  DELIVERED: { to: "COMPLETED", label: "Force: complete" },
  AUTHENTICATION_FAILED: { to: "REFUND_PENDING", label: "Mark refund pending" },
  DISPUTED: { to: "REFUND_PENDING", label: "Approve refund pending" },
  REFUND_PENDING: { to: "REFUNDED", label: "Complete refund" },
};

export function OrderActions({ orderId, status, isBuyer, isSeller, isAdmin, isAuthenticator }: Props) {
  const steps: { to: OrderStatus; label: string }[] = [];
  if (isSeller) {
    const step = SELLER_STEPS[status];
    if (step) steps.push(step);
  }
  if (isAuthenticator) {
    const step = AUTHENTICATOR_STEPS[status];
    if (step) steps.push(step);
  }
  if (isBuyer) {
    const step = BUYER_STEPS[status];
    if (step) steps.push(step);
  }
  if (isAdmin) {
    const step = ADMIN_STEPS[status];
    if (step && !steps.some((s) => s.to === step.to)) steps.push(step);
  }

  if (steps.length === 0) return null;

  return (
    <section aria-labelledby="actions-heading" className="mt-10">
      <h2 id="actions-heading" className="eyebrow">
        Available Actions
      </h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {steps.map((step) => (
          <TransitionButton key={step.to} orderId={orderId} to={step.to} label={step.label} admin={isAdmin} />
        ))}
      </div>
    </section>
  );
}

function TransitionButton({
  orderId,
  to,
  label,
  admin,
}: {
  orderId: string;
  to: OrderStatus;
  label: string;
  admin: boolean;
}) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(
    orderTransitionAction,
    {},
  );
  return (
    <form action={action} className="inline">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="note" value={`${label}${admin ? " (admin override)" : ""}`} />
      <button type="submit" disabled={pending} className="btn-imperial !min-h-10 px-5 text-[11px]">
        {pending ? "Working…" : label}
      </button>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
