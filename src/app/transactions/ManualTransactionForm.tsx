"use client";

import { useActionState } from "react";
import { createTransactionAction, type FormState } from "./actions";

const initialState: FormState = { error: null, success: null };

export function ManualTransactionForm({
  periods,
}: {
  periods: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createTransactionAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Add a transaction manually</h2>
      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <input className="input" id="description" name="description" required placeholder="e.g. Checkers Hyper" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="amount">
            Amount (R)
          </label>
          <input className="input" id="amount" name="amount" required type="number" step="0.01" min="0.01" />
        </div>
        <div>
          <label className="label" htmlFor="occurredAt">
            Date
          </label>
          <input className="input" id="occurredAt" name="occurredAt" required type="date" defaultValue={today} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="periodId">
          Budget period (optional)
        </label>
        <select className="input" id="periodId" name="periodId" defaultValue="">
          <option value="">None</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-brand-700">{state.success}</p> : null}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Adding..." : "Add transaction"}
      </button>
    </form>
  );
}
