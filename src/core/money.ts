/**
 * Money is stored as integer minor units (cents). Never floats.
 * All arithmetic happens here so the rest of the codebase cannot drift.
 */

export type CurrencyCode = "USD" | "EUR" | "GBP";

export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ["USD", "EUR", "GBP"];

export interface Money {
  /** Amount in minor units (cents). Always an integer ≥ 0. */
  amountCents: number;
  currency: CurrencyCode;
}

const MAX_CENTS = 1_000_000_000_00; // 1 billion major units — sanity ceiling

export function money(amountCents: number, currency: CurrencyCode = "USD"): Money {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || amountCents > MAX_CENTS) {
    throw new MoneyError(`Invalid amountCents: ${String(amountCents)}`);
  }
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new MoneyError(`Unsupported currency: ${currency}`);
  }
  return { amountCents, currency };
}

export class MoneyError extends Error {}

/** Parse a user-facing decimal string ("12,500.00") into cents. Rejects floats-in-disguise. */
export function parseMoneyInput(input: string, currency: CurrencyCode = "USD"): Money {
  const cleaned = input.replace(/[,\s_]/g, "");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(cleaned)) {
    throw new MoneyError(`Invalid money format: "${input}"`);
  }
  const [wholePart, fracPart = ""] = cleaned.split(".");
  const cents = Number(wholePart) * 100 + Number(fracPart.padEnd(2, "0"));
  return money(cents, currency);
}

/** cents → "31,800.00" */
export function formatMoneyInput(value: Money): string {
  return (value.amountCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const SYMBOLS: Record<CurrencyCode, string> = { USD: "$", EUR: "€", GBP: "£" };

/** Display formatting: "$31,800" (minor display) or with decimals when non-round. */
export function formatMoney(value: Money, opts?: { decimals?: boolean }): string {
  const decimals = opts?.decimals ?? value.amountCents % 100 !== 0;
  const formatted = (value.amountCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  return `${SYMBOLS[value.currency]}${formatted}`;
}

export function addMoney(a: Money, b: Money): Money {
  requireSameCurrency(a, b);
  return money(a.amountCents + b.amountCents, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  requireSameCurrency(a, b);
  return money(a.amountCents - b.amountCents, a.currency);
}

export function multiplyMoney(a: Money, qty: number): Money {
  if (!Number.isSafeInteger(qty) || qty < 0) {
    throw new MoneyError(`Invalid quantity: ${String(qty)}`);
  }
  return money(a.amountCents * qty, a.currency);
}

export function compareMoney(a: Money, b: Money): number {
  requireSameCurrency(a, b);
  return a.amountCents - b.amountCents;
}

export function maxMoney(a: Money, b: Money): Money {
  return compareMoney(a, b) >= 0 ? a : b;
}

export function minMoney(a: Money, b: Money): Money {
  return compareMoney(a, b) <= 0 ? a : b;
}

export function moneyEquals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amountCents === b.amountCents;
}

export function isPositiveMoney(a: Money): boolean {
  return a.amountCents > 0;
}

/**
 * Percentage fee, rounded half-up at the cent level. `basisPoints` = 1/100 of a percent.
 * Deterministic, so payment math is testable.
 */
export function applyBasisPoints(value: Money, basisPoints: number): Money {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) {
    throw new MoneyError(`Invalid basisPoints: ${String(basisPoints)}`);
  }
  const raw = (value.amountCents * basisPoints) / 10_000;
  const rounded = Math.round(raw * 100) / 100; // round to cents, half-up
  return money(Math.round(rounded), value.currency);
}

function requireSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
