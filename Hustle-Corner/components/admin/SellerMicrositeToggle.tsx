"use client";

import { useTransition } from "react";
import { setSellerMicrosite } from "@/app/admin/actions";

export default function SellerMicrositeToggle({
  sellerId,
  hasMicrosite,
}: {
  sellerId: string;
  hasMicrosite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setSellerMicrosite(sellerId, !hasMicrosite);
        })
      }
      className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        hasMicrosite ? "border border-gray-300" : "bg-brand-600 text-white"
      }`}
    >
      {hasMicrosite ? "Disable micro-site" : "Enable micro-site"}
    </button>
  );
}
