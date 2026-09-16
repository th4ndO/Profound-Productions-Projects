"use client";

import { useActionState } from "react";
import { createGoalAction, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function NewGoalForm() {
  const [state, formAction, pending] = useActionState(createGoalAction, initialState);

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Create a savings goal</h2>
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input className="input" id="name" name="name" required placeholder="e.g. Laptop fund" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="targetAmount">
            Target amount (R)
          </label>
          <input className="input" id="targetAmount" name="targetAmount" type="number" step="0.01" min="0.01" required />
        </div>
        <div>
          <label className="label" htmlFor="targetDate">
            Target date
          </label>
          <input className="input" id="targetDate" name="targetDate" type="date" required />
        </div>
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Creating..." : "Create goal"}
      </button>
    </form>
  );
}
