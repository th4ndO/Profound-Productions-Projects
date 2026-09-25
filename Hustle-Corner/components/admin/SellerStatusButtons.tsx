"use client";

import { useTransition } from "react";
import { setSellerStatus } from "@/app/admin/actions";

export default function SellerStatusButtons({
  sellerId,
  status,
}: {
  sellerId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  function set(next: "approved" | "hidden") {
    startTransition(async () => {
      await setSellerStatus(sellerId, next);
    });
  }

  return (
    <div className="flex gap-2">
      {status !== "approved" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => set("approved")}
          className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {status !== "hidden" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => set("hidden")}
          className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Hide
        </button>
      )}
    </div>
  );
}
