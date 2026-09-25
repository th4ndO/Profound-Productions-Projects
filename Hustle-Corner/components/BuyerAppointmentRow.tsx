"use client";

import { useTransition } from "react";
import Link from "next/link";
import { cancelAppointment } from "@/app/bookings/actions";
import type { BuyerAppointment } from "@/lib/appointments";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BuyerAppointmentRow({ appointment }: { appointment: BuyerAppointment }) {
  const [pending, startTransition] = useTransition();
  const canCancel = appointment.status === "pending" || appointment.status === "confirmed";

  return (
    <li className="rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/s/${appointment.sellerSlug}`} className="font-medium hover:underline">
            {appointment.sellerBusinessName}
          </Link>
          <p className="text-sm text-gray-600">{formatWhen(appointment.startAt)}</p>
          {appointment.serviceName && (
            <p className="text-sm text-gray-500">{appointment.serviceName}</p>
          )}
          {appointment.note && <p className="mt-1 text-sm text-gray-700">{appointment.note}</p>}
          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[appointment.status]}`}
          >
            {STATUS_LABEL[appointment.status]}
          </span>
        </div>
        {canCancel && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => { await cancelAppointment(appointment.id); })}
            className="shrink-0 text-sm text-red-600 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </li>
  );
}
