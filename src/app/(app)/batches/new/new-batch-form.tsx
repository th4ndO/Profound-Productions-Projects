"use client";

import { useActionState } from "react";
import { createBatchAction, type FormState } from "../actions";

const initialState: FormState = { error: null };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewBatchForm({ recipes }: { recipes: Array<{ id: string; name: string; standardYieldQty: number }> }) {
  const [state, formAction, pending] = useActionState(createBatchAction, initialState);

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="recipeId">
          Recipe
        </label>
        <select id="recipeId" name="recipeId" required className="input">
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} (standard yield {r.standardYieldQty})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="targetYield">
          Target yield
        </label>
        <input
          id="targetYield"
          name="targetYield"
          type="number"
          step="any"
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="plannedFor">
          Planned for
        </label>
        <input
          id="plannedFor"
          name="plannedFor"
          type="date"
          required
          defaultValue={todayIso()}
          className="input"
        />
      </div>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Plan batch"}
      </button>
    </form>
  );
}
