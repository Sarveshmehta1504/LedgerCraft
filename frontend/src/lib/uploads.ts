import { extname, join } from "node:path";

/**
 * Where uploaded images live on disk.
 *
 * Deliberately not `public/` — Next.js snapshots that directory at build time,
 * so anything written there after `next build` is served as a 404. Files here
 * are streamed back by the /api/uploads/[file] route instead.
 */
export const UPLOAD_DIR = join(process.cwd(), ".uploads");

/** The API stores `profile_image` as a string capped at 255 characters, so the
 *  path we hand it has to stay short — a generated name, never the original. */
export const UPLOAD_URL_PREFIX = "/api/uploads";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Only formats a browser renders inline; anything else is rejected outright. */
const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export function extensionForType(type: string): string | null {
  return ALLOWED[type] ?? null;
}

export function contentTypeForFile(name: string): string {
  const ext = extname(name).toLowerCase();
  const match = Object.entries(ALLOWED).find(([, value]) => value === ext);
  return match ? match[0] : "application/octet-stream";
}

/**
 * Guards the [file] segment before it is joined onto a filesystem path — only
 * names this app generated can match, so `..` or a nested path cannot escape
 * the upload directory.
 */
export function isSafeUploadName(name: string): boolean {
  return /^[A-Za-z0-9_-]+\.(png|jpg|webp|gif|svg)$/.test(name);
}

export const ACCEPTED_TYPES = Object.keys(ALLOWED).join(",");
