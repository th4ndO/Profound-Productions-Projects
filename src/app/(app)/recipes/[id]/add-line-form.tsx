"use client";

import { useActionState, useState } from "react";
import type { FormState } from "../actions";

const initialState: FormState = { error: null };

export function AddLineForm({
  action,
  ingredients,
  recipes,
  units,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  ingredients: Array<{ id: string; name: string }>;
  recipes: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; symbol: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [lineType, setLineType] = useState<"ingredient" | "subrecipe">("ingredient");

  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-stone-900">Add a line</h2>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="lineType"
            value="ingredient"
            checked={lineType === "ingredient"}
            onChange={() => setLineType("ingredient")}
          />
          Ingredient
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="lineType"
            value="subrecipe"
            checked={lineType === "subrecipe"}
            onChange={() => setLineType("subrecipe")}
          />
          Sub-recipe
        </label>
      </div>

      {lineType === "ingredient" ? (
        <div>
          <label className="label" htmlFor="ingredientId">
            Ingredient
          </label>
          <select id="ingredientId" name="ingredientId" className="input">
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="childRecipeId">
            Sub-recipe
          </label>
          <select id="childRecipeId" name="childRecipeId" className="input">
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="quantity">
            Quantity
          </label>
          <input id="quantity" name="quantity" type="number" step="any" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="unitId">
            Unit
          </label>
          <select id="unitId" name="unitId" required className="input">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Adding..." : "Add line"}
      </button>
    </form>
  );
}
