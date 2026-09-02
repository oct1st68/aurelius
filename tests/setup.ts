import { beforeEach } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Test bootstrap: every test file gets a fresh, isolated data directory.
 * Services import `repos()` / `store` lazily, so re-pointing the env var here
 * (before importing app code in the test body) gives full isolation.
 */

export const testDataDirs: string[] = [];

beforeEach(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "aurelius-test-"));
  testDataDirs.push(dir);
  process.env.AURELIUS_DATA_DIR = dir;
  process.env.AURELIUS_STORAGE_DIR = path.join(dir, "storage");
});
