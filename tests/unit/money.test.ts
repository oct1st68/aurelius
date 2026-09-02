import { describe, expect, it } from "vitest";
import {
  money,
  parseMoneyInput,
  formatMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  applyBasisPoints,
  MoneyError,
  moneyEquals,
} from "@/core/money";

describe("money", () => {
  it("stores amounts as integer minor units", () => {
    expect(money(3180000).amountCents).toBe(3180000);
  });

  it("rejects floats and negatives", () => {
    expect(() => money(10.5)).toThrow(MoneyError);
    expect(() => money(-1)).toThrow(MoneyError);
    expect(() => money(Number.NaN)).toThrow(MoneyError);
  });

  it("rejects unsupported currencies", () => {
    expect(() => money(100, "JPY" as never)).toThrow(MoneyError);
  });

  it("parses user input", () => {
    expect(parseMoneyInput("12,500.00").amountCents).toBe(1250000);
    expect(parseMoneyInput("0.99").amountCents).toBe(99);
    expect(parseMoneyInput("31,800").amountCents).toBe(3180000);
  });

  it("rejects malformed input", () => {
    expect(() => parseMoneyInput("abc")).toThrow(MoneyError);
    expect(() => parseMoneyInput("1.234")).toThrow(MoneyError);
    expect(() => parseMoneyInput("")).toThrow(MoneyError);
  });

  it("formats for display", () => {
    expect(formatMoney(money(3180000))).toBe("$31,800");
    expect(formatMoney(money(123456), { decimals: true })).toBe("$1,234.56");
  });

  it("adds, subtracts, multiplies within one currency", () => {
    expect(addMoney(money(100), money(200)).amountCents).toBe(300);
    expect(subtractMoney(money(300), money(100)).amountCents).toBe(200);
    expect(multiplyMoney(money(250), 3).amountCents).toBe(750);
  });

  it("refuses cross-currency math", () => {
    expect(() => addMoney(money(100, "USD"), money(100, "EUR"))).toThrow(MoneyError);
  });

  it("applies basis points with half-up cent rounding", () => {
    expect(applyBasisPoints(money(10_000), 500).amountCents).toBe(500); // 5%
    expect(applyBasisPoints(money(999), 500).amountCents).toBe(50); // rounds
    expect(applyBasisPoints(money(1), 5000).amountCents).toBe(1); // rounds up from 0.5
  });

  it("equality checks both amount and currency", () => {
    expect(moneyEquals(money(100), money(100))).toBe(true);
    expect(moneyEquals(money(100, "USD"), money(100, "EUR"))).toBe(false);
  });
});
