"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { adminRefundAction, type AdminFormState } from "@/app/(site)/actions/admin-actions";
import { ConfirmSubmit } from "./confirm-submit";
import { OrderStatusBadge } from "@/components/commerce/order-status-badge";
import { formatMoney } from "@/core/money";
import type { Order, Payment } from "@/domain/entities";

export function AdminRefundRow({
  order,
  payment,
  model,
}: {
  order: Order;
  payment: Payment | null;
  model: string;
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(adminRefundAction, {});
  const [amount, setAmount] = useState("");
  const refundable =
    payment &&
    (payment.status === "SUCCEEDED" || payment.status === "PARTIALLY_REFUNDED") &&
    order.status !== "REFUNDED";

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/orders/${order.id}`} className="font-serif-lux text-lg text-ivory hover:text-gold">
            {model}
          </Link>
          <p className="text-xs text-bronze">
            Order {order.id.slice(-8).toUpperCase()} · {formatMoney(order.total)}
            {payment && ` · ${payment.provider} ${payment.status.toLowerCase()}`}
            {payment && payment.refunds.length > 0 && ` · refunded ${formatMoney({ amountCents: payment.refunds.reduce((s, r) => s + r.amountCents, 0), currency: payment.amount.currency })}`}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {refundable && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t hairline pt-4">
          <label htmlFor={`refund-${order.id}`} className="label-imperial !mb-0">
            Refund amount (blank = full)
          </label>
          <input
            id={`refund-${order.id}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={(payment.amount.amountCents / 100).toFixed(2)}
            className="input-imperial !min-h-9 !w-28 py-1 text-sm"
          />
          <ConfirmSubmit
            action={action}
            hidden={{ paymentId: payment.id, amount }}
            label="Refund…"
            className="btn-imperial btn-burgundy !min-h-9 px-4 text-[10px]"
            danger
            confirmTitle="Process refund?"
            confirmBody={`A ${amount ? `partial refund of ${amount}` : "full refund"} will be issued through the payment provider and the order state will advance. This action is audit-logged.`}
            confirmLabel="Process refund"
          >
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="amount" value={amount} />
            <input type="hidden" name="reason" value="Refund by admin console" />
          </ConfirmSubmit>
          {state.error && <span role="alert" className="text-xs text-red-400">{state.error}</span>}
          {state.ok && <span className="text-xs text-emerald-400">{state.message}</span>}
        </div>
      )}
    </div>
  );
}
