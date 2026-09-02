/**
 * Time helpers. All persisted timestamps are ISO-8601 UTC strings — stable in JSON,
 * sortable, and directly portable to PostgreSQL `timestamptz`.
 */

export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function fromIso(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ISO date: ${value}`);
  return d;
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(fromIso(iso).getTime() + minutes * 60_000).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(fromIso(iso).getTime() + days * 86_400_000).toISOString();
}

export function isExpired(iso: string, at: string = nowIso()): boolean {
  return fromIso(iso).getTime() <= fromIso(at).getTime();
}

/** Deterministic clock for tests: pass a fixed start, advance with `advance`. */
export class FakeClock {
  private current: Date;
  constructor(startIso: string) {
    this.current = fromIso(startIso);
  }
  now(): string {
    return this.current.toISOString();
  }
  advance(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}
