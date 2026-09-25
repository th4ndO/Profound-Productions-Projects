"use client";

import { useTransition } from "react";
import { deletePhoto } from "@/app/dashboard/actions";

export default function DeletePhotoButton({
  photoId,
  storagePath,
}: {
  photoId: string;
  storagePath: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await deletePhoto(photoId, storagePath); })}
      className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white disabled:opacity-50"
    >
      ×
    </button>
  );
}
