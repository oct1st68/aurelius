/**
 * Seeds the register on server boot when the catalog is empty.
 * Runs in the Node.js runtime once per server start — framework-native,
 * works on any host (Railway/Render/Fly/VPS) without start-command tricks.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { runSeed } = await import("../scripts/seed");
  await runSeed(false);
}
