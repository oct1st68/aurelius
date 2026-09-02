/**
 * InMemoryRateLimiter — sliding-window counter per key+bucket.
 * Scope: single process (sufficient for localhost; for multi-instance deployments
 * swap the implementation, the interface stays).
 *
 * Never log the bucket key contents (may include emails) — callers control that.
 */

interface WindowState {
  hits: number[];
  /** lazily pruned when > 256 stale entries */
  stale: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class InMemoryRateLimiter {
  private windows = new Map<string, WindowState>();
  /** periodically drop dead windows so the map cannot grow unbounded */
  private lastSweep = 0;

  constructor(private maxHits: number, private windowMs: number) {}

  check(key: string, at: number = Date.now()): RateLimitResult {
    this.sweep(at);
    let state = this.windows.get(key);
    if (!state) {
      state = { hits: [], stale: 0 };
      this.windows.set(key, state);
    }
    const windowStart = at - this.windowMs;
    state.hits = state.hits.filter((t) => t > windowStart);
    if (state.hits.length >= this.maxHits) {
      const oldest = state.hits[0] ?? at;
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - at) / 1000)),
      };
    }
    state.hits.push(at);
    return {
      allowed: true,
      remaining: this.maxHits - state.hits.length,
      retryAfterSeconds: 0,
    };
  }

  /** Test helper: reset all windows. */
  reset(): void {
    this.windows.clear();
  }

  private sweep(at: number): void {
    if (at - this.lastSweep < 60_000) return;
    this.lastSweep = at;
    for (const [key, state] of this.windows) {
      const newest = state.hits[state.hits.length - 1] ?? 0;
      if (newest <= at - 10 * this.windowMs) {
        this.windows.delete(key);
      }
    }
  }
}

const limiters = new Map<string, InMemoryRateLimiter>();

export const RATE_LIMITS = {
  login: { max: 8, windowMs: 60_000 },
  register: { max: 5, windowMs: 60 * 60_000 },
  passwordReset: { max: 4, tokenInvalidations: true, windowMs: 60 * 60_000 },
  offer: { max: 20, windowMs: 60_000 },
  review: { max: 5, windowMs: 60_000 },
  checkout: { max: 10, windowMs: 60_000 },
  search: { max: 60, windowMs: 60_000 },
  upload: { max: 30, windowMs: 60_000 },
} as const;

/** One limiter instance per named bucket (login, register, …). */
export function getRateLimiter(bucket: keyof typeof RATE_LIMITS): InMemoryRateLimiter {
  let limiter = limiters.get(bucket);
  if (!limiter) {
    const cfg = RATE_LIMITS[bucket];
    limiter = new InMemoryRateLimiter(cfg.max, cfg.windowMs);
    limiters.set(bucket, limiter);
  }
  return limiter;
}

export function enforceRateLimit(bucket: keyof typeof RATE_LIMITS, key: string): void {
  const result = getRateLimiter(bucket).check(key);
  if (!result.allowed) {
    const error = new Error("Too many requests. Try again shortly.") as Error & {
      code: string;
      retryAfterSeconds: number;
    };
    error.code = "RATE_LIMITED";
    error.retryAfterSeconds = result.retryAfterSeconds;
    throw error;
  }
}
