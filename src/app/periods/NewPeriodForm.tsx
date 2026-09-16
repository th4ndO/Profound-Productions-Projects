"use client";

import { useActionState } from "react";
import { createPeriodAction, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function NewPeriodForm() {
  const [state, formAction, pending] = useActionState(createPeriodAction, initialState);

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Create a budget period</h2>
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input className="input" id="name" name="name" required placeholder="e.g. 2027 Semester 1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="startDate">
            Start date
          </label>
          <input className="input" id="startDate" name="startDate" type="date" required />
        </div>
        <div>
          <label className="label" htmlFor="endDate">
            End date
          </label>
          <input className="input" id="endDate" name="endDate" type="date" required />
        </div>
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Creating..." : "Create period"}
      </button>
    </form>
  );
}
