/**
 * MockPaymentProvider — deterministic payment simulation for localhost.
 * The test card number drives the outcome; nothing here touches real money.
 *
 *   4242 4242 4242 4242 → success
 *   4000 0000 0000 0002 → declined
 *   4000 0000 0000 3220 → requires_action (3DS-style confirmation)
 *   4000 0000 0000 9995 → insufficient funds (declined)
 *
 * Real Stripe would implement the same interface with webhook-driven
 * confirmation; see docs/DATABASE-MIGRATION.md § Payment providers.
 */

import { ConflictError, PaymentFailedError } from "@/core/errors";
import { generateId } from "@/core/ids";
import type { Money } from "@/core/money";
import type { PaymentIntentStatus, PaymentStatus } from "@/domain/enums";

export interface PaymentIntentInput {
  amount: Money;
  idempotencyKey: string;
  /** Digits only; drives the mock outcome. */
  cardNumber: string;
  description: string;
}

export interface PaymentIntentResult {
  providerRef: string;
  status: PaymentIntentStatus;
}

export interface PaymentProvider {
  readonly name: "mock" | "stripe";
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  /** Confirms and settles. Returns the terminal payment status. */
  confirm(providerRef: string, input: PaymentIntentInput): Promise<PaymentStatus>;
  refund(providerRef: string, amount: Money, reason: string): Promise<PaymentStatus>;
}

const DECLINED_REASONS: Record<string, string> = {
  "4000000000000002": "Card declined by issuer",
  "4000000000009995": "Insufficient funds",
};

function normalizeCard(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  private simulated: Map<string, PaymentIntentStatus> = new Map();

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const card = normalizeCard(input.cardNumber);
    const providerRef = `mock_pi_${generateId("pay").slice(4)}`;
    let status: PaymentIntentStatus;
    if (card === "4000000000003220") {
      status = "requires_action";
    } else if (card === "4242424242424242") {
      status = "processing";
    } else if (DECLINED_REASONS[card]) {
      status = "declined";
    } else {
      status = "declined";
    }
    this.simulated.set(providerRef, status);
    return { providerRef, status };
  }

  async confirm(providerRef: string, input: PaymentIntentInput): Promise<PaymentStatus> {
    const card = normalizeCard(input.cardNumber);
    if (card === "4000000000003220") {
      // Simulates the "user completed 3DS" path.
      return "SUCCEEDED";
    }
    if (DECLINED_REASONS[card]) {
      throw new PaymentFailedError(DECLINED_REASONS[card]);
    }
    if (card !== "4242424242424242") {
      throw new PaymentFailedError("Invalid test card");
    }
    return "SUCCEEDED";
  }

  async refund(providerRef: string, amount: Money, reason: string): Promise<PaymentStatus> {
    if (amount.amountCents <= 0) {
      throw new ConflictError("Refund amount must be positive");
    }
    if (reason.trim().length === 0) {
      throw new ConflictError("Refund reason is required");
    }
    return "REFUNDED";
  }
}

let provider: PaymentProvider | undefined;

export function paymentProvider(): PaymentProvider {
  if (!provider) provider = new MockPaymentProvider();
  return provider;
}

/** Test seam. */
export function setPaymentProvider(p: PaymentProvider | undefined): void {
  provider = p;
}
