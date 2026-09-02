import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth/request-context";
import { checkoutOrder } from "@/lib/services/checkout-service";
import { toUserMessage } from "@/core/errors";
import { enforceRateLimit } from "@/core/rate-limit";

interface Body {
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

/** Offer-acceptance checkout: pay an existing PENDING_PAYMENT order. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await getSession();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }
  await enforceRateLimit("checkout", auth.user.id);

  const { id } = await params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await checkoutOrder(auth, {
      orderId: id,
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
    return NextResponse.json({ ok: false, error: toUserMessage(error) }, { status: 402 });
  }
}
