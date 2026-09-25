import { LIMITS } from "@/config";

// compressImage() (client-side) targets LIMITS.maxPhotoSizeBytes, but it runs
// in the browser and is trivially skippable -- a request straight to the
// server action can attach any file. This is the server-side backstop:
// reject anything that isn't actually JPEG bytes (checked via the magic
// number, not the claimed content type) or that's implausibly large for a
// compressed portfolio photo.
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const MAX_UPLOAD_BYTES = LIMITS.maxPhotoSizeBytes * 3;

export async function validateJpegUpload(file: File): Promise<string | null> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return "That photo is too large.";
  }

  const header = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  const isJpeg = JPEG_MAGIC.every((byte, i) => header[i] === byte);
  if (!isJpeg) {
    return "That file isn't a valid photo.";
  }

  return null;
}
