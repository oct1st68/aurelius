/**
 * Generic collection repository over LocalJsonStore.
 * Provides find/create/update/delete with timestamps, unique constraints and
 * in-file filtering. This is the seam where LocalRepository → PostgresRepository
 * is swapped (same method surface, see docs/DATABASE-MIGRATION.md).
 */

import { ConflictError, NotFoundError } from "@/core/errors";
import { generateId, type IdPrefix } from "@/core/ids";
import type { BaseEntity } from "@/data/store/local-json-store";
import { LocalJsonStore, store as defaultStore } from "@/data/store/local-json-store";
import { globalMutex } from "@/data/store/lock";

export type Predicate<T> = (row: T) => boolean;

export interface Repository<T extends BaseEntity> {
  list(): Promise<T[]>;
  find(predicate: Predicate<T>): Promise<T | undefined>;
  findMany(predicate: Predicate<T>): Promise<T[]>;
  getById(id: string): Promise<T>;
  create(input: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, patch: Partial<Omit<T, "id" | "createdAt">>): Promise<T>;
  /** Atomic read-modify-write under the collection lock. */
  mutate(id: string, fn: (row: T) => T | null): Promise<T>;
  delete(id: string): Promise<void>;
  count(predicate?: Predicate<T>): Promise<number>;
}

export class JsonCollectionRepository<T extends BaseEntity> implements Repository<T> {
  constructor(
    private collectionName: string,
    private idPrefix: IdPrefix,
    private uniqueFields: (keyof T & string)[] = [],
    private storeInstance: LocalJsonStore = defaultStore,
  ) {}

  async list(): Promise<T[]> {
    return this.storeInstance.readCollection<T>(this.collectionName);
  }

  async find(predicate: Predicate<T>): Promise<T | undefined> {
    const rows = await this.list();
    return rows.find(predicate);
  }

  async findMany(predicate: Predicate<T>): Promise<T[]> {
    const rows = await this.list();
    return rows.filter(predicate);
  }

  async getById(id: string): Promise<T> {
    const row = await this.find((r) => r.id === id);
    if (!row) {
      throw new NotFoundError(`${this.collectionName.slice(0, -1)} not found`);
    }
    return row;
  }

  async create(input: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    const now = new Date().toISOString();
    let created: T | undefined;
    await this.storeInstance.withCollection<T>(this.collectionName, (rows) => {
      for (const field of this.uniqueFields) {
        const value = (input as Record<string, unknown>)[field];
        if (value === undefined) continue;
        const clash = rows.some((r) => r[field] === value);
        if (clash) {
          throw new ConflictError(`Duplicate ${String(field)}: "${String(value)}"`, {
            field: String(field),
          });
        }
      }
      created = {
        ...input,
        id: generateId(this.idPrefix),
        createdAt: now,
        updatedAt: now,
      } as T;
      return [...rows, created];
    });
    if (!created) throw new ConflictError("Create failed under concurrency");
    return created;
  }

  async update(id: string, patch: Partial<Omit<T, "id" | "createdAt">>): Promise<T> {
    return this.mutate(id, (row) => {
      const next = { ...row, ...patch, id: row.id, createdAt: row.createdAt } as T;
      next.updatedAt = new Date().toISOString();
      return next;
    });
  }

  async mutate(id: string, fn: (row: T) => T | null): Promise<T> {
    let result: T | undefined;
    await this.storeInstance.withCollection<T>(this.collectionName, (rows) => {
      const index = rows.findIndex((r) => r.id === id);
      if (index === -1) throw new NotFoundError(`${this.collectionName} id=${id} not found`);
      const current = rows[index];
      if (!current) throw new NotFoundError(`${this.collectionName} id=${id} not found`);
      const nextRow = fn(current);
      if (!nextRow) return null;
      const next = [...rows];
      next[index] = { ...nextRow, updatedAt: new Date().toISOString() };
      result = next[index];
      return next;
    });
    if (!result) throw new ConflictError("Mutate produced no row (concurrent update?)");
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.storeInstance.withCollection<T>(this.collectionName, (rows) =>
      rows.filter((r) => r.id !== id),
    );
  }

  async count(predicate?: Predicate<T>): Promise<number> {
    const rows = await this.list();
    return predicate ? rows.filter(predicate).length : rows.length;
  }

  /** Lock key used for cross-collection transactions (order service uses these). */
  get lockKey(): string {
    return `collection:${this.collectionName}`;
  }
}

export { globalMutex };
