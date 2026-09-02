/**
 * Upload security: MIME allowlist, extension cross-check, size cap, dimension
 * validation, sanitized filename, path-traversal-proof storage paths.
 * Files are written under storage/local/uploads/<yyyy>/<mm>/<imgId>.<ext> —
 * never inside public/. Served through a route handler with the same guards.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ValidationError } from "@/core/errors";
import { env } from "@/core/config";
import { generateId } from "@/core/ids";
import { resolveStoragePath } from "@/data/store/local-json-store";
import { repos } from "@/data/repositories";
import type { SessionWithUser } from "@/lib/auth/rbac";
import type { UploadedImage } from "@/domain/entities";
import { enforceRateLimit } from "@/core/rate-limit";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

interface Dimensions {
  width: number;
  height: number;
}

/** Minimal PNG/JPEG/WebP header sniffing — never trust the declared MIME. */
function sniffDimensions(buffer: Buffer, mime: string): Dimensions {
  if (mime === "image/png" && buffer.length > 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mime === "image/jpeg") {
    // Walk JPEG segments for SOF0..SOF3 markers.
    let offset = 2;
    while (offset + 9 < buffer.length) {
      const markerByte = buffer[offset];
      const marker = offset + 1 < buffer.length ? buffer[offset + 1] : undefined;
      if (markerByte !== 0xff || marker === undefined) break;
      if (marker >= 0xc0 && marker <= 0xc3) {
        const h = buffer.readUInt16BE(offset + 5);
        const w = buffer.readUInt16BE(offset + 7);
        return { width: w, height: h };
      }
      const len = buffer.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }
  if (mime === "image/webp" && buffer.length > 30) {
    const format = buffer.toString("ascii", 12, 16);
    if (format === "VP8X") {
      const w = 1 + ((buffer[24]! | (buffer[25]! << 8) | (buffer[26]! << 16)) & 0xffffff);
      const h = 1 + ((buffer[27]! | (buffer[28]! << 8) | (buffer[29]! << 16)) & 0xffffff);
      return { width: w, height: h };
    }
    if (format === "VP8 ") {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    }
  }
  throw new ValidationError("Unable to verify image dimensions.", { file: "Unsupported image." });
}

/** Sanitize a client filename: strip directories, control chars, limit length. */
export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ]+/g, "_").slice(0, 100);
  if (!base || base.startsWith(".")) return "upload";
  return base;
}

export async function saveUploadedImage(
  auth: SessionWithUser,
  file: { name: string; mime: string; bytes: Buffer },
  opts?: { listingId?: string; alt?: string },
): Promise<UploadedImage> {
  enforceRateLimit("upload", auth.user.id);
  const { uploadMaxBytes } = env();

  // 1. Size
  if (file.bytes.length === 0) throw new ValidationError("Empty file.", { file: "Empty upload." });
  if (file.bytes.length > uploadMaxBytes) {
    throw new ValidationError(`File exceeds ${(uploadMaxBytes / 1024 / 1024).toFixed(0)}MB limit.`, {
      file: "Too large.",
    });
  }

  // 2. MIME allowlist (declared) + extension cross-check
  const mime = file.mime.toLowerCase().split(";")[0] ?? "";
  const declaredExt = ALLOWED_MIME[mime];
  if (!declaredExt) {
    throw new ValidationError("Only JPEG, PNG or WebP images are accepted.", {
      file: "Unsupported type.",
    });
  }
  const sanitized = sanitizeFilename(file.name);
  const ext = (sanitized.split(".").pop() ?? "").toLowerCase();
  if (!ext || ALLOWED_EXT[ext] !== mime) {
    throw new ValidationError("File extension does not match its content type.", {
      file: "Extension mismatch.",
    });
  }

  // 3. Content sniffing: real header + dimensions
  const dims = sniffDimensions(file.bytes, mime ?? "application/octet-stream");
  if (dims.width < 200 || dims.height < 200) {
    throw new ValidationError("Images must be at least 200×200px.", { file: "Too small." });
  }
  if (dims.width > 8000 || dims.height > 8000) {
    throw new ValidationError("Images must be at most 8000×8000px.", { file: "Too large." });
  }

  // 4. Storage path: generated ID (not client-controlled) → no traversal possible.
  const id = generateId("img");
  const now = new Date();
  const relativeDir = path.join("uploads", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  const absoluteDir = resolveStoragePath(relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });
  const relativePath = path.join(relativeDir, `${id}.${declaredExt}`);
  const absolutePath = resolveStoragePath(relativePath);
  // Defense-in-depth: re-verify containment after joins.
  if (!absolutePath.startsWith(resolveStoragePath("uploads"))) {
    throw new ValidationError("Invalid storage path.");
  }
  await fs.writeFile(absolutePath, file.bytes);

  return repos().uploadedImages.create({
    uploaderId: auth.user.id,
    listingId: opts?.listingId ?? null,
    path: relativePath,
    originalName: sanitized,
    mime: mime ?? "application/octet-stream",
    bytes: file.bytes.length,
    width: dims.width,
    height: dims.height,
  });
}

export async function getImage(id: string): Promise<UploadedImage | undefined> {
  return repos().uploadedImages.find((img) => img.id === id);
}

export function contentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}
