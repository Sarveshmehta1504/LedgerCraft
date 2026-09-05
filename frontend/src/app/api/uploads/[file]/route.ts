import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_DIR, contentTypeForFile, isSafeUploadName } from "@/lib/uploads";

/** Streams a stored upload. Files live outside `public/`, which Next.js only
 *  serves for assets that existed at build time. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  // Reject anything this app did not generate before the name reaches a path.
  if (!isSafeUploadName(file)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await readFile(join(UPLOAD_DIR, file));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentTypeForFile(file),
        // Names are content-addressed by UUID, so a stored image never changes.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}
