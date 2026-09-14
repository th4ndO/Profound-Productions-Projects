"use client";

import { useActionState } from "react";
import { createRecipeAction, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function NewRecipeForm({
  units,
}: {
  units: Array<{ id: string; name: string; symbol: string }>;
}) {
  const [state, formAction, pending] = useActionState(createRecipeAction, initialState);

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
          <label className="label" htmlFor="standardYieldQty">
            Standard yield
          </label>
          <input
            id="standardYieldQty"
            name="standardYieldQty"
            type="number"
            step="any"
            required
            className="input"
            placeholder="e.g. 24"
          />
        </div>
        <div>
          <label className="label" htmlFor="yieldUnitId">
            Yield unit
          </label>
          <select id="yieldUnitId" name="yieldUnitId" required className="input">
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
          Incidentals rate % (packaging, consumables)
        </label>
        <input
          id="incidentalsRate"
          name="incidentalsRate"
          type="number"
          step="any"
          defaultValue={0}
          className="input"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" name="isSubRecipe" className="rounded border-stone-300" />
        This is a sub-recipe (a component of other recipes, not sold directly)
      </label>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Add recipe"}
      </button>
    </form>
  );
}
