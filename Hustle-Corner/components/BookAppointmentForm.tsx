"use client";

import { useActionState, useMemo, useState } from "react";
import { bookAppointment } from "@/app/s/[slug]/actions";
import type { OpenSlot } from "@/lib/availability";

type Service = { id: string; name: string };

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookAppointmentForm({
  sellerId,
  slug,
  services,
  slots,
}: {
  sellerId: string;
  slug: string;
  services: Service[];
  slots: OpenSlot[];
}) {
  const [selected, setSelected] = useState<OpenSlot | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) =>
      bookAppointment(sellerId, slug, formData),
    {},
  );

  const days = useMemo(() => {
    const grouped = new Map<string, OpenSlot[]>();
    for (const slot of slots) {
      const key = dayKey(slot.startAt);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(slot);
    }
    return Array.from(grouped.entries());
  }, [slots]);

  if (state.success) {
    return (
      <p className="mt-6 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
        Request sent — the seller will confirm on WhatsApp.
      </p>
    );
  }

  if (slots.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">Book an appointment</h2>
      <div className="space-y-4">
        {days.map(([day, daySlots]) => (
          <div key={day}>
            <p className="mb-2 text-sm font-medium text-gray-700">{day}</p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((slot) => (
                <button
                  key={slot.startAt}
                  type="button"
                  onClick={() => setSelected(slot)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    selected?.startAt === slot.startAt
                      ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                      : "border-gray-300"
                  }`}
                >
                  {timeLabel(slot.startAt)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <form action={formAction} className="mt-4 space-y-3 rounded-xl border border-gray-200 p-4">
          <input type="hidden" name="startAt" value={selected.startAt} />
          <input type="hidden" name="endAt" value={selected.endAt} />
          <p className="text-sm text-gray-600">
            Requesting <strong>{dayKey(selected.startAt)} at {timeLabel(selected.startAt)}</strong>
          </p>
          {services.length > 0 && (
            <div>
              <label htmlFor="serviceId" className="mb-1 block text-xs text-gray-500">
                Service (optional)
              </label>
              <select
                id="serviceId"
                name="serviceId"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">Not sure yet</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="note" className="mb-1 block text-xs text-gray-500">
              Note (optional)
            </label>
            <textarea
              id="note"
              name="note"
              rows={2}
              placeholder="Anything the seller should know"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Sending…" : "Request appointment"}
          </button>
        </form>
      )}
    </section>
  );
}
