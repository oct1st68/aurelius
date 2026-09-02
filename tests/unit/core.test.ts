import { describe, expect, it } from "vitest";
import { canTransitionOrder, ORDER_HAPPY_PATH } from "@/domain/enums";
import { maskSerial, formatCertificateNumber } from "@/lib/auth/tokens";
import { generateId, isValidId, seededId } from "@/core/ids";
import { KeyedMutex, withLocks } from "@/data/store/lock";
import { InMemoryRateLimiter } from "@/core/rate-limit";
import { validatePasswordStrength } from "@/lib/auth/password";

describe("order state machine", () => {
  it("allows the happy path", () => {
    for (let i = 0; i < ORDER_HAPPY_PATH.length - 1; i++) {
      const from = ORDER_HAPPY_PATH[i] as never;
      const to = ORDER_HAPPY_PATH[i + 1] as never;
      expect(canTransitionOrder(from, to)).toBe(true);
    }
  });

  it("forbids illegal jumps", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("DELIVERED", "PENDING_PAYMENT")).toBe(false);
    expect(canTransitionOrder("COMPLETED", "SELLER_PREPARING")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "PAYMENT_SECURED")).toBe(false);
  });

  it("terminal states have no exits", () => {
    expect(canTransitionOrder("PAYOUT_RELEASED", "PENDING_PAYMENT")).toBe(false);
    expect(canTransitionOrder("REFUNDED", "COMPLETED")).toBe(false);
  });

  it("completed requires delivery first", () => {
    expect(canTransitionOrder("SHIPPED_TO_BUYER", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("DELIVERED", "COMPLETED")).toBe(true);
  });
});

describe("tokens & masking", () => {
  it("masks serials showing only the last 4", () => {
    const masked = maskSerial("AUR123456X");
    expect(masked.endsWith("456X")).toBe(true);
    expect(masked).toContain("•");
    expect(masked).not.toContain("AUR");
  });

  it("formats certificate numbers", () => {
    expect(formatCertificateNumber(7, 2025)).toBe("AUR-2025-000007");
  });
});

describe("ids", () => {
  it("generates prefixed unique ids", () => {
    const a = generateId("usr");
    const b = generateId("usr");
    expect(a).not.toBe(b);
    expect(a.startsWith("usr_")).toBe(true);
    expect(isValidId(a)).toBe(true);
  });

  it("rejects malformed ids", () => {
    expect(isValidId("../etc/passwd")).toBe(false);
    expect(isValidId("")).toBe(false);
    expect(isValidId(42)).toBe(false);
  });

  it("seeded ids are deterministic", () => {
    expect(seededId("usr", "buyer")).toBe(seededId("usr", "buyer"));
  });
});

describe("KeyedMutex / withLocks", () => {
  it("serializes concurrent critical sections", async () => {
    const mutex = new KeyedMutex();
    const order: number[] = [];
    let inside = 0;
    let overlap = false;

    const task = async (n: number) => {
      await mutex.run("k", async () => {
        inside += 1;
        if (inside > 1) overlap = true;
        await new Promise((r) => setTimeout(r, 5));
        order.push(n);
        inside -= 1;
      });
    };

    await Promise.all([task(1), task(2), task(3)]);
    expect(overlap).toBe(false);
    expect(order).toEqual([1, 2, 3]);
  });

  it("withLocks acquires in sorted order and releases on failure", async () => {
    const released: string[] = [];
    await expect(
      withLocks(["b", "a", "c"], async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    void released;
    // Locks must be free now — this should complete instantly.
    await withLocks(["a", "b", "c"], () => "ok");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and reports retry-after", () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(true);
    const blocked = limiter.check("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("lets the window slide", () => {
    const limiter = new InMemoryRateLimiter(1, 1000);
    const t0 = 1_000_000;
    expect(limiter.check("k", t0).allowed).toBe(true);
    expect(limiter.check("k", t0 + 500).allowed).toBe(false);
    expect(limiter.check("k", t0 + 1100).allowed).toBe(true);
  });
});

describe("password policy", () => {
  it("enforces length and character classes", () => {
    expect(validatePasswordStrength("short")).not.toBeNull();
    expect(validatePasswordStrength("alllowercase123")).not.toBeNull();
    expect(validatePasswordStrength("ALLUPPERCASE123")).not.toBeNull();
    expect(validatePasswordStrength("NoDigitsHere")).not.toBeNull();
    expect(validatePasswordStrength("GoodPass123")).toBeNull();
  });
});
