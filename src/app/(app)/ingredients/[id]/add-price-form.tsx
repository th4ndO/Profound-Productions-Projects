"use client";

import { useActionState } from "react";
import type { FormState } from "../actions";

const initialState: FormState = { error: null };

export function AddPriceForm({
  action,
  purchaseUnitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  purchaseUnitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-stone-900">Record a new price</h2>
      <p className="text-xs text-stone-500">
        Price is for ONE {purchaseUnitLabel}. Prices are append-only — this
        never edits or removes an earlier price, it only adds a new one
        effective now.
      </p>
      <div>
        <label className="label" htmlFor="priceRand">
          Price (Rand)
        </label>
        <input
          id="priceRand"
          name="priceRand"
          type="number"
          step="0.01"
          required
          className="input"
          placeholder="e.g. 45.00"
        />
      </div>
      <div>
        <label className="label" htmlFor="source">
          Source (optional)
        </label>
        <input id="source" name="source" className="input" placeholder="Supplier invoice #..." />
      </div>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Recording..." : "Record price"}
      </button>
    </form>
  );
}
