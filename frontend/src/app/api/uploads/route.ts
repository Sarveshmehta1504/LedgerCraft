import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_DIR,
  UPLOAD_URL_PREFIX,
  extensionForType,
} from "@/lib/uploads";

/**
 * Receives a contact's profile image.
 *
 * The accounting API has no file endpoint — its `profile_image` column is a
 * string capped at 255 characters — so the bytes are stored here and only the
 * short path is handed to the backend. That keeps the whole feature inside the
 * frontend while the record itself still lives in the database.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file was uploaded." }, { status: 400 });
  }

  const extension = extensionForType(file.type);
  if (!extension) {
    return NextResponse.json(
      { message: "Use a PNG, JPG, WEBP, GIF or SVG image." },
      { status: 415 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: `That image is over ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
      { status: 413 },
    );
  }

  // The stored name is generated, never the caller's — an uploaded filename is
  // untrusted input and would otherwise reach a filesystem path.
  const name = `${randomUUID()}${extension}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ message: "Could not save that image." }, { status: 500 });
  }

  return NextResponse.json({ url: `${UPLOAD_URL_PREFIX}/${name}` }, { status: 201 });
}
