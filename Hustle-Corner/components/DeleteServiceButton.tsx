"use client";

import { useTransition } from "react";
import { deleteService } from "@/app/dashboard/actions";

export default function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await deleteService(serviceId); })}
      className="text-sm text-red-600 disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
