"use client";

import { useActionState } from "react";
import { createIngredientAction, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function NewIngredientForm({
  units,
}: {
  units: Array<{ id: string; name: string; symbol: string }>;
}) {
  const [state, formAction, pending] = useActionState(createIngredientAction, initialState);

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" required className="input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="purchaseUnitId">
            Purchase unit
          </label>
          <select id="purchaseUnitId" name="purchaseUnitId" required className="input">
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
            className="input"
            placeholder="e.g. 2.5 (kg per bag)"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="recipeUnitId">
            Recipe unit
          </label>
          <select id="recipeUnitId" name="recipeUnitId" required className="input">
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
            defaultValue={100}
            required
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="supplier">
          Supplier (optional)
        </label>
        <input id="supplier" name="supplier" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="initialPriceRand">
          Initial price in Rand (optional — for ONE purchase quantity)
        </label>
        <input
          id="initialPriceRand"
          name="initialPriceRand"
          type="number"
          step="0.01"
          className="input"
          placeholder="e.g. 45.00"
        />
      </div>

      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Add ingredient"}
      </button>
    </form>
  );
}
