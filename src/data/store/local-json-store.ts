/**
 * LocalJsonStore — the ONLY module in the codebase that touches the JSON files
 * under dataDir. Repositories build on this; services never call fs directly;
 * React components never call services' storage internals.
 *
 * Guarantees:
 *  - atomic writes: temp file + rename (no torn files on crash)
 *  - per-collection locking: read-modify-write via `withCollection`
 *  - missing file → empty collection (first run friendly)
 *  - malformed file → quarantined to `<name>.corrupt-<ts>` and treated as empty
 *    (recovery; the seed script can always rebuild)
 *  - timestamps: base entity shape is enforced here
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/core/config";
import { globalMutex } from "./lock";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export function resolveDataPath(...segments: string[]): string {
  const dataDir = path.resolve(process.cwd(), env().dataDir);
  const resolved = path.resolve(dataDir, ...segments);
  if (!resolved.startsWith(dataDir + path.sep) && resolved !== dataDir) {
    throw new Error(`Path escapes data directory: ${segments.join("/")}`);
  }
  return resolved;
}

export function resolveStoragePath(...segments: string[]): string {
  const storageDir = path.resolve(process.cwd(), env().storageDir);
  const resolved = path.resolve(storageDir, ...segments);
  if (!resolved.startsWith(storageDir + path.sep) && resolved !== storageDir) {
    throw new Error(`Path escapes storage directory: ${segments.join("/")}`);
  }
  return resolved;
}

export class LocalJsonStore {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? path.resolve(process.cwd(), env().dataDir);
  }

  /** Serialize: temp file in the same directory + atomic rename. */
  async writeCollection<T>(name: string, rows: T[]): Promise<void> {
    await this.ensureDir();
    const file = this.fileFor(name);
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    const json = JSON.stringify(rows, null, 2);
    await fs.writeFile(tmp, json, "utf8");
    await fs.rename(tmp, file);
  }

  /**
   * Read a collection with recovery semantics. Never throws on malformed JSON:
   * the corrupt file is quarantined and an empty array is returned.
   */
  async readCollection<T>(name: string): Promise<T[]> {
    const file = this.fileFor(name);
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return [];
      throw error;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      return parsed as T[];
    } catch {
      const quarantined = `${file}.corrupt-${Date.now()}`;
      try {
        await fs.rename(file, quarantined);
      } catch {
        /* quarantine best-effort; the read still returns empty */
      }
      console.warn(
        `[store] Malformed collection "${name}" quarantined to ${path.basename(quarantined)}; returning empty.`,
      );
      return [];
    }
  }

  /**
   * Transactional read-modify-write under the collection's mutex.
   * `mutate` returns the full new row set (or null to abort with no write).
   */
  async withCollection<T>(
    name: string,
    mutate: (rows: T[]) => Promise<T[] | null> | T[] | null,
  ): Promise<void> {
    await globalMutex.run(`collection:${name}`, async () => {
      const rows = await this.readCollection<T>(name);
      const next = await mutate(rows);
      if (next !== null) {
        await this.writeCollection(name, next);
      }
    });
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  async exists(name: string): Promise<boolean> {
    try {
      await fs.access(this.fileFor(name));
      return true;
    } catch {
      return false;
    }
  }

  private fileFor(name: string): string {
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error(`Invalid collection name: ${name}`);
    }
    return path.join(this.dataDir, `${name}.json`);
  }
}

/** Shared store instance for the default data dir. */
export const store = new LocalJsonStore();

export function touchTimestamps<T extends Partial<BaseEntity>>(entity: T): T {
  const at = new Date().toISOString();
  if (!entity.createdAt) {
    return { ...entity, createdAt: at, updatedAt: at } as T;
  }
  return { ...entity, updatedAt: at } as T;
}
