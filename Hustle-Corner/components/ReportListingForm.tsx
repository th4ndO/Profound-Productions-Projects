"use client";

import { useActionState, useState } from "react";
import { submitReport } from "@/app/s/[slug]/actions";

export default function ReportListingForm({ sellerId }: { sellerId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) =>
      submitReport(sellerId, formData),
    {},
  );

  if (state.success) {
    return <p className="mt-6 text-sm text-gray-500">Thanks — we&apos;ll take a look.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 text-sm text-gray-500 underline"
      >
        Report this listing
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-6 rounded-xl border border-gray-200 p-4">
      <label htmlFor="reason" className="mb-2 block text-sm font-medium">
        What&apos;s wrong?
      </label>
      <textarea
        id="reason"
        name="reason"
        placeholder="Tell us what happened"
        rows={3}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gray-800 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Sending…" : "Submit report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
