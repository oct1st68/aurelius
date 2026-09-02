import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth/request-context";
import { createDirectOrder, checkoutOrder } from "@/lib/services/checkout-service";
import { toUserMessage, AppError } from "@/core/errors";
import { enforceRateLimit } from "@/core/rate-limit";

interface Body {
  listingId: string;
  shipping: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    country: string;
    phone: string | null;
  };
  cardNumber: string;
  cardExpMonth: number;
  cardExpYear: number;
  cardCvc: string;
  cardholderName: string;
}

/**
 * Direct cart checkout endpoint. Creates the order (reserving the watch) and
 * charges through the PaymentProvider with an idempotency key generated
 * server-side per cart line. The client can never set order/payment status.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await getSession();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }
  await enforceRateLimit("checkout", auth.user.id);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.listingId) {
    return NextResponse.json({ ok: false, error: "listingId is required" }, { status: 400 });
  }

  try {
    const order = await createDirectOrder(auth, body.listingId);
    const result = await checkoutOrder(auth, {
      orderId: order.id,
      shipping: body.shipping,
      cardNumber: body.cardNumber,
      cardExpMonth: body.cardExpMonth,
      cardExpYear: body.cardExpYear,
      cardCvc: body.cardCvc,
      cardholderName: body.cardholderName,
      idempotencyKey: randomUUID(),
    });
    return NextResponse.json({ ok: true, orderId: result.order.id });
  } catch (error) {
    // On payment failure the reserved order stays PENDING_PAYMENT for retry;
    // surface a clean message.
    const status = error instanceof AppError && error.code === "VALIDATION" ? 400 : 402;
    return NextResponse.json({ ok: false, error: toUserMessage(error) }, { status });
  }
}
