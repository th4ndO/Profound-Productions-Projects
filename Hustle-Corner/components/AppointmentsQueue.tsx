"use client";

import { useTransition } from "react";
import { confirmAppointment, declineAppointment, cancelAppointment } from "@/app/bookings/actions";
import type { SellerAppointment } from "@/lib/appointments";

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

function AppointmentRow({
  appointment,
  children,
}: {
  appointment: SellerAppointment;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{formatWhen(appointment.startAt)}</p>
          <p className="text-sm text-gray-500">
            {appointment.buyerName}
            {appointment.serviceName && ` · ${appointment.serviceName}`}
          </p>
          {appointment.note && <p className="mt-1 text-sm text-gray-700">{appointment.note}</p>}
        </div>
        <div className="flex shrink-0 gap-2">{children}</div>
      </div>
    </li>
  );
}

export default function AppointmentsQueue({ appointments }: { appointments: SellerAppointment[] }) {
  const [pending, startTransition] = useTransition();

  const requests = appointments.filter((a) => a.status === "pending");
  const upcoming = appointments.filter(
    (a) => a.status === "confirmed" && new Date(a.startAt).getTime() > Date.now(),
  );

  return (
    <div className="space-y-6">
      {requests.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Requests ({requests.length})
          </h3>
          <ul className="space-y-2">
            {requests.map((a) => (
              <AppointmentRow key={a.id} appointment={a}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await confirmAppointment(a.id); })}
                  className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await declineAppointment(a.id); })}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-50"
                >
                  Decline
                </button>
              </AppointmentRow>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Upcoming
        </h3>
        {upcoming.length > 0 ? (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <AppointmentRow key={a.id} appointment={a}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(async () => { await cancelAppointment(a.id); })}
                  className="text-sm text-red-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </AppointmentRow>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No upcoming appointments.</p>
        )}
      </div>
    </div>
  );
}
