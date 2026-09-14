"use client";

import { useActionState } from "react";
import { createProductAction, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function NewProductForm({ recipes }: { recipes: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(createProductAction, initialState);

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="recipeId">
          Recipe
        </label>
        <select id="recipeId" name="recipeId" required className="input">
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {recipes.length === 0 ? (
          <p className="mt-1 text-xs text-stone-500">
            Every non-sub-recipe already has a product, or no recipes exist yet.
          </p>
        ) : null}
      </div>
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
          defaultValue={0}
          className="input"
        />
      </div>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Add product"}
      </button>
    </form>
  );
}
