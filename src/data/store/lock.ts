/**
 * In-process async mutexes keyed by string (collection name or composite key).
 * All read-modify-write cycles on a collection MUST run inside a lock.
 *
 * Re-entrancy: locks are re-entrant within the same async execution context
 * (tracked via AsyncLocalStorage). This lets withLocks() hold several
 * collection locks while inner services acquire them again — without
 * deadlocks. Nested acquires are counted and released on outermost exit.
 *
 * Scope note: single Node process. The PostgreSQL repository implements the
 * same contract with `SELECT ... FOR UPDATE` (docs/DATABASE-MIGRATION.md).
 */

import { AsyncLocalStorage } from "node:async_hooks";

type Waiter = () => void;

interface LockEntry {
  busy: boolean;
  queue: Waiter[];
}

const als = new AsyncLocalStorage<Map<string, number>>();

export class KeyedMutex {
  private locks = new Map<string, LockEntry>();

  /** Acquire one key. Re-entrant within the same async context. */
  async acquire(key: string): Promise<void> {
    const held = als.getStore();
    if (held?.has(key)) {
      held.set(key, (held.get(key) ?? 0) + 1);
      return;
    }
    let entry = this.locks.get(key);
    if (!entry) {
      entry = { busy: false, queue: [] };
      this.locks.set(key, entry);
    }
    if (!entry.busy) {
      entry.busy = true;
      if (held) held.set(key, 1);
      return;
    }
    await new Promise<void>((resolve) => {
      entry.queue.push(resolve);
    });
    if (held) held.set(key, 1);
  }

  release(key: string): void {
    const held = als.getStore();
    if (held?.has(key)) {
      const count = (held.get(key) ?? 0) - 1;
      if (count > 0) {
        held.set(key, count);
        return; // nested release — outermost exit will free the lock
      }
      held.delete(key);
    }
    this.free(key);
  }

  private free(key: string): void {
    const entry = this.locks.get(key);
    if (!entry) return;
    const next = entry.queue.shift();
    if (next) {
      next();
    } else {
      entry.busy = false;
    }
  }

  /** Run a critical section under one key. */
  async run<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    await this.acquire(key);
    try {
      return await fn();
    } finally {
      this.release(key);
    }
  }
}

export const globalMutex = new KeyedMutex();

/**
 * Multi-key transaction: acquire all locks (sorted — no deadlocks), run the
 * critical section inside an ALS context that records ownership so nested
 * acquisitions of the same keys are re-entrant, then release in reverse.
 */
export async function withLocks<T>(lockKeys: string[], fn: () => Promise<T> | T): Promise<T> {
  const sorted = [...new Set(lockKeys)].sort();
  return als.run(new Map(), async () => {
    const held: string[] = [];
    try {
      for (const key of sorted) {
        await globalMutex.acquire(key);
        held.push(key);
      }
      return await fn();
    } finally {
      for (const key of held.reverse()) {
        globalMutex.release(key);
      }
    }
  });
}
