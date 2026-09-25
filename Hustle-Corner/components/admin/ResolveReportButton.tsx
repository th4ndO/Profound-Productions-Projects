"use client";

import { useTransition } from "react";
import { resolveReport } from "@/app/admin/actions";

export default function ResolveReportButton({ reportId }: { reportId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await resolveReport(reportId); })}
      className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
    >
      {pending ? "…" : "Resolve"}
    </button>
  );
}
