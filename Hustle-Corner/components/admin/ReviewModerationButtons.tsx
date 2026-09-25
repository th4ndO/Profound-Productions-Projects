"use client";

import { useTransition } from "react";
import { setReviewHidden, deleteReview } from "@/app/admin/actions";

export default function ReviewModerationButtons({
  reviewId,
  isHidden,
}: {
  reviewId: string;
  isHidden: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => { await setReviewHidden(reviewId, !isHidden); })}
        className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-50"
      >
        {isHidden ? "Unhide" : "Hide"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => { await deleteReview(reviewId); })}
        className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
