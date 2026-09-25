"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/app/s/[slug]/actions";

export default function ReviewForm({ sellerId, slug }: { sellerId: string; slug: string }) {
  const [rating, setRating] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => submitReview(sellerId, slug, formData),
    {},
  );

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 p-4">
      <p className="mb-2 text-sm font-medium">Leave a review</p>
      <input type="hidden" name="rating" value={rating} />
      <div className="mb-3 flex gap-1" role="group" aria-label="Rating out of 5 stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            aria-pressed={n <= rating}
            className={`h-8 w-8 text-2xl leading-none ${n <= rating ? "text-amber-500" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <label htmlFor="comment" className="mb-1 block text-xs text-gray-500">
        Comment <span className="text-gray-400">(optional)</span>
      </label>
      <textarea
        id="comment"
        name="comment"
        placeholder="What was your experience?"
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || rating === 0}
        className="mt-3 rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
