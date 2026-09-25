"use client";

/**
 * Client-side only. Downscales and re-encodes an image file as JPEG,
 * stepping quality/dimensions down until it fits under maxBytes (or gives
 * up after a few tries and returns the smallest attempt).
 */
export async function compressImage(
  file: File,
  { maxDimension = 1600, maxBytes = 1_000_000 }: { maxDimension?: number; maxBytes?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Always return a real re-encoded JPEG — callers upload this with a
  // .jpg name and an image/jpeg content type, so the bytes must actually
  // be JPEG even when re-encoding doesn't shrink a tiny/already-optimized
  // source image.
  let quality = 0.85;
  let blob = await canvasToBlob(canvas, quality);

  for (let i = 0; i < 5 && blob.size > maxBytes && quality > 0.35; i++) {
    quality -= 0.15;
    blob = await canvasToBlob(canvas, quality);
  }

  return blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}
