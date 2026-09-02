import type { OrderStatus } from "@/domain/enums";

const STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "badge-warn",
  PAYMENT_SECURED: "badge-ok",
  SELLER_PREPARING: "badge-warn",
  SHIPPED_TO_AUTHENTICATOR: "badge-warn",
  AUTHENTICATING: "badge-warn",
  AUTHENTICATED: "badge-ok",
  AUTHENTICATION_FAILED: "badge-bad",
  SHIPPED_TO_BUYER: "badge-warn",
  DELIVERED: "badge-ok",
  COMPLETED: "badge-ok",
  CANCELLED: "badge-bad",
  REFUND_PENDING: "badge-warn",
  REFUNDED: "badge-bad",
  DISPUTED: "badge-bad",
  PAYOUT_RELEASED: "badge-ok",
};

const LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_SECURED: "Payment secured",
  SELLER_PREPARING: "Seller preparing",
  SHIPPED_TO_AUTHENTICATOR: "To authenticator",
  AUTHENTICATING: "Authenticating",
  AUTHENTICATED: "Authenticated",
  AUTHENTICATION_FAILED: "Authentication failed",
  SHIPPED_TO_BUYER: "Shipped to you",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed",
  PAYOUT_RELEASED: "Payout released",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${STYLES[status]} shrink-0`}>{LABELS[status]}</span>;
}
