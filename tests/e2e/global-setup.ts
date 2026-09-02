import { execFileSync } from "node:child_process";
import path from "node:path";

/** Reset deterministic JSON fixtures once before the serial E2E suite. */
export default function globalSetup(): void {
  const root = path.resolve(process.cwd());
  execFileSync("pnpm", ["data"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}
