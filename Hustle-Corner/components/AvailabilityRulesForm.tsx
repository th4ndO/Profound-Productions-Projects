"use client";

import { useActionState, useTransition } from "react";
import { addAvailabilityRule, deleteAvailabilityRule } from "@/app/dashboard/actions";
import type { AvailabilityRule } from "@/lib/availability";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(t: string) {
  return t.slice(0, 5);
}

export default function AvailabilityRulesForm({ rules }: { rules: AvailabilityRule[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => addAvailabilityRule(formData),
    {},
  );
  const [deleting, startDeleteTransition] = useTransition();

  return (
    <div className="space-y-3">
      {rules.length > 0 && (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div>
                <p className="font-medium">{DAY_LABELS[r.dayOfWeek]}</p>
                <p className="text-sm text-gray-500">
                  {formatTime(r.startTime)}–{formatTime(r.endTime)} · {r.slotMinutes}-min slots
                </p>
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={() => startDeleteTransition(async () => { await deleteAvailabilityRule(r.id); })}
                className="text-sm text-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
        <div>
          <label htmlFor="dayOfWeek" className="mb-1 block text-xs text-gray-500">
            Day
          </label>
          <select
            id="dayOfWeek"
            name="dayOfWeek"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            defaultValue="1"
          >
            {DAY_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="w-1/2">
            <label htmlFor="startTime" className="mb-1 block text-xs text-gray-500">
              From
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              required
              defaultValue="09:00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="w-1/2">
            <label htmlFor="endTime" className="mb-1 block text-xs text-gray-500">
              To
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              required
              defaultValue="17:00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label htmlFor="slotMinutes" className="mb-1 block text-xs text-gray-500">
            Appointment length (minutes)
          </label>
          <input
            id="slotMinutes"
            name="slotMinutes"
            type="number"
            min={5}
            max={480}
            step={5}
            defaultValue={30}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add availability"}
        </button>
      </form>
    </div>
  );
}
