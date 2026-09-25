"use client";

import { useState, useTransition } from "react";
import { deleteOwnAccount } from "@/app/dashboard/actions";

export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-600 underline"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-800">
        This permanently deletes your account, seller profile, services,
        photos, reviews, and reports. This can&apos;t be undone.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteOwnAccount();
              if (result?.error) setError(result.error);
            })
          }
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes, delete everything"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
