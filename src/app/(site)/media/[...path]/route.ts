import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveStoragePath } from "@/data/store/local-json-store";
import { repos } from "@/data/repositories";

const MIME: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Media server for storage/local — NEVER serves anything outside the storage
 * root (path traversal shield), never serves sensitive JSON data.
 * Usage: /media/<path-under-storage-local>
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const segments = (await params).path;
  if (!segments.length || segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const relative = segments.join("/");
  const absolute = resolveStoragePath(relative);
  try {
    const data = await readFile(absolute);
    const ext = relative.slice(relative.lastIndexOf(".")).toLowerCase();
    const mime = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    // Fall back to a placeholder so the UI never shows broken images.
    const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500"><rect width="1200" height="1500" fill="#121110"/><rect x="40" y="40" width="1120" height="1420" fill="none" stroke="#b89b5e" stroke-opacity="0.3" stroke-width="2"/><circle cx="600" cy="700" r="280" fill="none" stroke="#80684a" stroke-width="3"/><text x="600" y="1160" text-anchor="middle" font-family="Georgia" font-size="36" fill="#80684a" letter-spacing="6">AURELIUS</text><text x="600" y="1230" text-anchor="middle" font-family="monospace" font-size="20" fill="#5a5245">IMAGE UNAVAILABLE</text></svg>`;
    return new NextResponse(placeholder, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    });
  } finally {
    void repos;
  }
}
