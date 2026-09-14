"use client";

import { useActionState } from "react";
import type { FormState } from "../actions";

const initialState: FormState = { error: null };

export function EditProductForm({
  action,
  product,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  product: { sellingPriceCents: number; minMarginPercent: number; active: boolean };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-stone-900">Edit product</h2>
      <div>
        <label className="label" htmlFor="sellingPriceRand">
          Selling price (Rand)
        </label>
        <input
          id="sellingPriceRand"
          name="sellingPriceRand"
          type="number"
          step="0.01"
          required
          defaultValue={(product.sellingPriceCents / 100).toFixed(2)}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="minMarginPercent">
          Minimum margin %
        </label>
        <input
          id="minMarginPercent"
          name="minMarginPercent"
          type="number"
          step="any"
          defaultValue={product.minMarginPercent}
          className="input"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={product.active}
          className="rounded border-stone-300"
        />
        Active
      </label>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
