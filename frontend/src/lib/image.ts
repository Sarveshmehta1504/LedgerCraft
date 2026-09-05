/** Every profile image is stored at this size, square. */
export const PROFILE_IMAGE_SIZE = 1080;

/**
 * Centre-crops an image to a square and redraws it at 1080×1080.
 *
 * Cropping rather than stretching: a portrait squeezed into a square looks
 * wrong, so the long edge is trimmed evenly on both sides and the subject stays
 * in proportion. Anything smaller than 1080 is scaled up so every stored avatar
 * has identical dimensions and the grid never has to reflow around odd sizes.
 *
 * Runs in the browser — the API takes the finished file, so no server-side
 * image processing is involved.
 */
export async function toSquareProfileImage(file: File): Promise<File> {
  const bitmap = await loadBitmap(file);

  const side = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - side) / 2;
  const sourceY = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_IMAGE_SIZE;
  canvas.height = PROFILE_IMAGE_SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process that image.");

  context.imageSmoothingQuality = "high";
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    side,
    side,
    0,
    0,
    PROFILE_IMAGE_SIZE,
    PROFILE_IMAGE_SIZE,
  );
  if ("close" in bitmap) bitmap.close();

  // WebP keeps a 1080² photo well under the upload cap; browsers that cannot
  // encode it fall back to PNG, which the API accepts too.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.92),
  );
  const encoded = blob ?? (await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png")));
  if (!encoded) throw new Error("Could not process that image.");

  const extension = encoded.type === "image/webp" ? "webp" : "png";
  return new File([encoded], `profile.${extension}`, { type: encoded.type });
}

/** `createImageBitmap` handles orientation and is faster; older Safari needs the tag. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // SVG and a few encoders are rejected here — fall through to the tag.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("That file could not be read as an image."));
      image.src = url;
    });
  } finally {
    // Revoking after decode is safe; the bitmap no longer needs the URL.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
