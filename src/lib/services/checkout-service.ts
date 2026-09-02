/**
 * Checkout & payment orchestration. Idempotency contract:
 *  - the client supplies a checkoutIdempotencyKey (UUID generated per cart page)
 *  - payments.idempotencyKey is UNIQUE — a repeated checkout with the same key
 *    returns the existing payment instead of charging again
 *  - order status only advances to PAYMENT_SECURED when the PaymentProvider
 *    confirms; the client can never set order or payment statuses directly
 *
 * The whole charge cycle runs inside withLocks(orders, payments, listings) —
 * the listing PUBLISHED→SOLD and the payment insert land together or not at all.
 */

import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, PaymentFailedError, ValidationError } from "@/core/errors";
import { addMoney, money, multiplyMoney, type Money } from "@/core/money";
import { nowIso } from "@/core/time";
import type { Order, Payment, PaymentRefund } from "@/domain/entities";
import { repos } from "@/data/repositories";
import { withLocks } from "@/data/store/lock";
import { isAdmin, type SessionWithUser } from "@/lib/auth/rbac";
import { paymentProvider } from "./payment-provider";
import { transitionOrder } from "./order-service";
import { audit } from "./audit-service";
import { notify } from "./notification-service";
import { assertPurchasable, getListingById } from "./listing-service";

export const SHIPPING_FLAT_CENTS = 7_500; // insured courier, flat demo rate
export const INSURANCE_BPS = 100; // 1% of item price

export interface ShippingInput {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
}

export interface CheckoutInput {
  orderId: string;
  shipping: ShippingInput;
  /** Test card; digits/spaces. Drives the mock outcome. */
  cardNumber: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardCvc: string;
  cardholderName: string;
  idempotencyKey: string;
}

export interface CheckoutQuote {
  itemPrice: Money;
  shippingCost: Money;
  insuranceCost: Money;
  total: Money;
}

export function quoteFor(order: Order): CheckoutQuote {
  const currency = order.currency;
  const itemPrice = order.itemPrice;
  const shippingCost = money(SHIPPING_FLAT_CENTS, currency);
  const insuranceCost = money(
    Math.round((itemPrice.amountCents * INSURANCE_BPS) / 10_000),
    currency,
  );
  const total = addMoney(addMoney(itemPrice, shippingCost), insuranceCost);
  return { itemPrice, shippingCost, insuranceCost, total };
}

function validateCard(input: CheckoutInput): void {
  const digits = input.cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) {
    throw new ValidationError("Card number looks invalid.", { cardNumber: "Enter 13–19 digits." });
  }
  if (!/^\d{3,4}$/.test(input.cardCvc)) {
    throw new ValidationError("CVC looks invalid.", { cardCvc: "3–4 digits." });
  }
  const month = input.cardExpMonth;
  const year = input.cardExpYear;
  const now = new Date();
  if (!(month >= 1 && month <= 12)) {
    throw new ValidationError("Expiry month invalid.", { cardExpMonth: "1–12." });
  }
  const expiry = new Date(2000 + (year < 100 ? year : year - 2000), month, 0, 23, 59);
  if (expiry < now) {
    throw new ValidationError("Card is expired.", { cardExpYear: "Use a future date." });
  }
  if (input.cardholderName.trim().length < 2) {
    throw new ValidationError("Cardholder name required.", { cardholderName: "Required." });
  }
}

/** Ensures only the buyer (or admin) can act on an order. */
async function assertBuyerOrAdmin(auth: SessionWithUser, order: Order): Promise<void> {
  if (order.buyerId !== auth.user.id && !isAdmin(auth.user)) {
    throw new ConflictError("Only the buyer can check out this order.");
  }
}

/**
 * Direct-purchase checkout: creates the order from a PUBLISHED listing,
 * reserves the watch, and returns the order for payment.
 */
export async function createDirectOrder(
  auth: SessionWithUser,
  listingId: string,
): Promise<Order> {
  return withLocks(["collection:listings", "collection:orders"], async () => {
    const listing = await repos().listings.find((l) => l.id === listingId);
    if (!listing) throw new NotFoundError("Listing not found");
    if (listing.sellerId === auth.user.id) {
      throw new ConflictError("You cannot buy your own listing.");
    }
    assertPurchasable(listing);

    const order = await repos().orders.create({
      listingId: listing.id,
      buyerId: auth.user.id,
      sellerId: listing.sellerId,
      itemPrice: listing.price,
      shippingCost: money(0, listing.price.currency),
      insuranceCost: money(0, listing.price.currency),
      total: listing.price,
      currency: listing.price.currency,
      status: "PENDING_PAYMENT",
      timeline: [
        {
          id: `evt_${Math.random().toString(36).slice(2, 10)}`,
          at: nowIso(),
          from: null,
          to: "PENDING_PAYMENT",
          note: "Order created — Buy Now",
          actorId: auth.user.id,
        },
      ],
      shippingAddress: {
        fullName: "",
        line1: "",
        line2: null,
        city: "",
        postalCode: "",
        country: "",
        phone: null,
      },
      offerId: null,
      certificateId: null,
      passportId: null,
      checkoutIdempotencyKey: null,
      trackingNumber: null,
    });

    await repos().listings.update(listing.id, { status: "RESERVED" });
    await notify({
      userId: listing.sellerId,
      type: "ORDER_UPDATED",
      title: "New order",
      body: `“${listing.model}” was purchased — awaiting payment confirmation.`,
      link: `/seller/orders/${order.id}`,
      dedupeKey: `order-created:${order.id}`,
    });
    return order;
  });
}

export interface CheckoutResult {
  order: Order;
  payment: Payment;
}

/**
 * The critical section: validate → charge via provider (idempotent) →
 * mark payment SUCCEEDED → order PAYMENT_SECURED → listing SOLD.
 * On provider failure the payment row records DECLINED and the order stays
 * PENDING_PAYMENT (retryable with a new or same idempotency key + fixed input).
 */
export async function checkoutOrder(
  auth: SessionWithUser,
  input: CheckoutInput,
): Promise<CheckoutResult> {
  validateCard(input);
  return withLocks(
    ["collection:orders", "collection:payments", "collection:listings"],
    async () => {
      const order = await repos().orders.find((o) => o.id === input.orderId);
      if (!order) throw new NotFoundError("Order not found");
      await assertBuyerOrAdmin(auth, order);

      // Idempotency FIRST: a retry with the same key returns the original
      // result even if the order has already advanced (no double charge).
      const existingPayment = await repos().payments.find(
        (p) => p.idempotencyKey === input.idempotencyKey,
      );
      if (existingPayment) {
        if (existingPayment.orderId !== order.id) {
          throw new ConflictError("Idempotency key reuse across orders.");
        }
        const fresh = (await repos().orders.find((o) => o.id === order.id)) as Order;
        return { order: fresh, payment: existingPayment };
      }

      if (order.status !== "PENDING_PAYMENT") {
        throw new ConflictError(`Order is ${order.status.toLowerCase()} — checkout unavailable.`);
      }

      const quote = quoteFor(order);
      const provider = paymentProvider();
      const intent = await provider.createIntent({
        amount: quote.total,
        idempotencyKey: input.idempotencyKey,
        cardNumber: input.cardNumber,
        description: `AURELIUS order ${order.id}`,
      });

      const payment = await repos().payments.create({
        orderId: order.id,
        provider: provider.name,
        providerRef: intent.providerRef,
        amount: quote.total,
        status: intent.status === "declined" ? "DECLINED" : "PROCESSING",
        idempotencyKey: input.idempotencyKey,
        refunds: [],
        failureReason: null,
      });

      // Persist shipping details on the order (first successful checkout attempt).
      await repos().orders.update(order.id, {
        shippingAddress: input.shipping,
        shippingCost: quote.shippingCost,
        insuranceCost: quote.insuranceCost,
        total: quote.total,
        checkoutIdempotencyKey: input.idempotencyKey,
      });

      if (intent.status === "declined") {
        await repos().payments.update(payment.id, {
          status: "DECLINED",
          failureReason: "Card declined (mock)",
        });
        throw new PaymentFailedError("Your card was declined. Try another card.");
      }

      try {
        const finalStatus = await provider.confirm(intent.providerRef, {
          amount: quote.total,
          idempotencyKey: input.idempotencyKey,
          cardNumber: input.cardNumber,
          description: `AURELIUS order ${order.id}`,
        });
        if (finalStatus !== "SUCCEEDED") {
          throw new PaymentFailedError("Payment could not be completed.");
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Payment failed";
        await repos().payments.update(payment.id, { status: "DECLINED", failureReason: reason });
        throw error instanceof PaymentFailedError
          ? error
          : new PaymentFailedError("Payment could not be completed.");
      }

      await repos().payments.update(payment.id, { status: "SUCCEEDED" });

      // Payment confirmed by the provider — advance order + sell the listing.
      const updated = await transitionOrder({
        orderId: order.id,
        to: "PAYMENT_SECURED",
        actor: null,
        actorType: "system",
        note: `Payment ${payment.id} confirmed by ${provider.name} provider`,
      });

      const listing = await getListingById(order.listingId);
      if (listing.status === "RESERVED") {
        await repos().listings.update(listing.id, { status: "SOLD" });
      } else if (listing.status === "PUBLISHED") {
        // Direct checkout race: mark sold now (order already created under lock).
        await repos().listings.update(listing.id, { status: "SOLD" });
      }

      return { order: updated, payment: { ...payment, status: "SUCCEEDED" } };
    },
  );
}

/** Mock 3DS-style "requires action" confirmation — advances the same flow. */
export async function confirmRequiredAction(
  auth: SessionWithUser,
  paymentId: string,
): Promise<CheckoutResult> {
  return withLocks(["collection:orders", "collection:payments", "collection:listings"], async () => {
    const payment = await repos().payments.find((p) => p.id === paymentId);
    if (!payment) throw new NotFoundError("Payment not found");
    const order = await repos().orders.find((o) => o.id === payment.orderId);
    if (!order) throw new NotFoundError("Order not found");
    await assertBuyerOrAdmin(auth, order);
    if (payment.status !== "PROCESSING") {
      throw new ConflictError(`Payment is ${payment.status.toLowerCase()}.`);
    }
    await repos().payments.update(payment.id, { status: "SUCCEEDED" });
    const updated = await transitionOrder({
      orderId: order.id,
      to: "PAYMENT_SECURED",
      actor: null,
      actorType: "system",
      note: `3DS action confirmed for payment ${payment.id}`,
    });
    const listing = await getListingById(order.listingId);
    if (listing.status === "RESERVED" || listing.status === "PUBLISHED") {
      await repos().listings.update(listing.id, { status: "SOLD" });
    }
    return { order: updated, payment: { ...payment, status: "SUCCEEDED" } };
  });
}

/**
 * Refund (admin): full or partial. Marks order REFUND_PENDING → REFUNDED and
 * releases/cancels the payout if needed. Audit-logged; money math in cents.
 */
export async function refundPayment(
  auth: SessionWithUser,
  paymentId: string,
  amountCents: number | null,
  reason: string,
): Promise<Payment> {
  if (!isAdmin(auth.user)) throw new ConflictError("Admins only");
  if (reason.trim().length < 4) throw new ValidationError("Refund reason required.");
  return withLocks(["collection:payments", "collection:orders"], async () => {
    const payment = await repos().payments.find((p) => p.id === paymentId);
    if (!payment) throw new NotFoundError("Payment not found");
    if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
      throw new ConflictError("Only successful payments can be refunded.");
    }
    const refundAmount = amountCents ?? payment.amount.amountCents;
    if (refundAmount <= 0 || refundAmount > payment.amount.amountCents) {
      throw new ValidationError("Refund amount out of range.");
    }
    const alreadyRefunded = payment.refunds.reduce((sum, r) => sum + r.amountCents, 0);
    if (alreadyRefunded + refundAmount > payment.amount.amountCents) {
      throw new ConflictError("Refund exceeds payment amount.");
    }

    const provider = paymentProvider();
    await provider.refund(payment.providerRef, money(refundAmount, payment.amount.currency), reason);

    const refund: PaymentRefund = {
      id: `rfd_${randomUUID().slice(0, 8)}`,
      amountCents: refundAmount,
      reason,
      at: nowIso(),
    };
    const totalAfter = alreadyRefunded + refundAmount;
    const status = totalAfter === payment.amount.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
    const updated = await repos().payments.update(payment.id, {
      status,
      refunds: [...payment.refunds, refund],
    });

    const order = await repos().orders.find((o) => o.id === payment.orderId);
    if (order && status === "REFUNDED" && order.status !== "REFUNDED" && order.status !== "CANCELLED") {
      await transitionOrder({
        orderId: order.id,
        to: order.status === "PENDING_PAYMENT" ? "CANCELLED" : "REFUND_PENDING",
        actor: auth,
        note: `Refund issued: ${reason}`,
      });
      if (order.status !== "PENDING_PAYMENT") {
        await transitionOrder({
          orderId: order.id,
          to: "REFUNDED",
          actor: auth,
          note: "Refund completed",
        });
      }
    }

    await audit({
      actorType: "user",
      actorId: auth.user.id,
      action: "payment.refunded",
      targetType: "payment",
      targetId: payment.id,
      meta: { refundAmount, reason },
    });
    return updated;
  });
}

export async function getPaymentForOrder(orderId: string): Promise<Payment | null> {
  return (await repos().payments.find((p) => p.orderId === orderId)) ?? null;
}

export { multiplyMoney };
