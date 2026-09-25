"use client";

import { useTransition } from "react";
import { deleteOwnReview } from "@/app/s/[slug]/actions";

export default function OwnReview({
  reviewId,
  slug,
  rating,
  comment,
}: {
  reviewId: string;
  slug: string;
  rating: number;
  comment: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Your review · {rating}/5</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => { await deleteOwnReview(reviewId, slug); })}
          className="text-sm text-red-600 disabled:opacity-50"
        >
          {pending ? "Removing…" : "Remove"}
        </button>
      </div>
      {comment && <p className="mt-2 text-sm text-gray-700">{comment}</p>}
    </div>
  );
}
