"use client";

import { useActionState } from "react";
import type { FormState } from "../actions";

const initialState: FormState = { error: null };

export function EditIngredientForm({
  action,
  ingredient,
  units,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  ingredient: {
    name: string;
    purchaseUnitId: string;
    purchaseQuantity: number;
    recipeUnitId: string;
    yieldPercent: number;
    supplier: string | null;
  };
  units: Array<{ id: string; name: string; symbol: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card space-y-4">
      <h2 className="text-sm font-semibold text-stone-900">Edit ingredient</h2>
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" required defaultValue={ingredient.name} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="purchaseUnitId">
            Purchase unit
          </label>
          <select
            id="purchaseUnitId"
            name="purchaseUnitId"
            required
            defaultValue={ingredient.purchaseUnitId}
            className="input"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="purchaseQuantity">
            Purchase quantity
          </label>
          <input
            id="purchaseQuantity"
            name="purchaseQuantity"
            type="number"
            step="any"
            required
            defaultValue={ingredient.purchaseQuantity}
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="recipeUnitId">
            Recipe unit
          </label>
          <select
            id="recipeUnitId"
            name="recipeUnitId"
            required
            defaultValue={ingredient.recipeUnitId}
            className="input"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="yieldPercent">
            Yield %
          </label>
          <input
            id="yieldPercent"
            name="yieldPercent"
            type="number"
            step="any"
            required
            defaultValue={ingredient.yieldPercent}
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="supplier">
          Supplier
        </label>
        <input
          id="supplier"
          name="supplier"
          defaultValue={ingredient.supplier ?? ""}
          className="input"
        />
      </div>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
