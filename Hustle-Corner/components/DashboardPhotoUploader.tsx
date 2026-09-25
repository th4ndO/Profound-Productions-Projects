"use client";

import { useState } from "react";
import { addPhotos } from "@/app/dashboard/actions";
import { compressImage } from "@/lib/imageCompression";
import { LIMITS } from "@/config";

export default function DashboardPhotoUploader({ remaining }: { remaining: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    if (!files.length) return;

    setBusy(true);
    setError(null);
    const fd = new FormData();
    for (const [i, file] of files.entries()) {
      const blob = await compressImage(file, { maxBytes: LIMITS.maxPhotoSizeBytes });
      fd.append("photos", blob, `photo-${i}.jpg`);
    }
    const result = await addPhotos(fd);
    if (result.error) setError(result.error);
    setBusy(false);
    e.target.value = "";
  }

  if (remaining <= 0) {
    return <p className="text-sm text-gray-500">You&apos;ve reached the {LIMITS.maxPortfolioPhotos}-photo limit.</p>;
  }

  return (
    <div>
      <label className="block cursor-pointer rounded-lg border border-dashed border-gray-400 px-4 py-4 text-center text-sm text-gray-500">
        {busy ? "Uploading…" : "Tap to add photos"}
        <input type="file" accept="image/*" multiple onChange={handleChange} disabled={busy} className="hidden" />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
