"use client";

import { useActionState } from "react";
import type { FormState } from "../actions";

const initialState: FormState = { error: null };

export function EditRecipeForm({
  action,
  recipe,
  units,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  recipe: {
    name: string;
    standardYieldQty: number;
    yieldUnitId: string;
    incidentalsRate: number;
    isSubRecipe: boolean;
  };
  units: Array<{ id: string; name: string; symbol: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-stone-900">Recipe details</h2>
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" required defaultValue={recipe.name} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="standardYieldQty">
            Standard yield
          </label>
          <input
            id="standardYieldQty"
            name="standardYieldQty"
            type="number"
            step="any"
            required
            defaultValue={recipe.standardYieldQty}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="yieldUnitId">
            Yield unit
          </label>
          <select
            id="yieldUnitId"
            name="yieldUnitId"
            required
            defaultValue={recipe.yieldUnitId}
            className="input"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="incidentalsRate">
          Incidentals rate %
        </label>
        <input
          id="incidentalsRate"
          name="incidentalsRate"
          type="number"
          step="any"
          defaultValue={recipe.incidentalsRate}
          className="input"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="isSubRecipe"
          defaultChecked={recipe.isSubRecipe}
          className="rounded border-stone-300"
        />
        This is a sub-recipe
      </label>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
