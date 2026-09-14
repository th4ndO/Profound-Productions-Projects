"use client";

import { useActionState } from "react";
import { createConversionAction, createUnitAction, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function NewUnitForm() {
  const [state, formAction, pending] = useActionState(createUnitAction, initialState);
  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-stone-900">Add a unit</h2>
      <div>
        <label className="label" htmlFor="unit-name">
          Name
        </label>
        <input id="unit-name" name="name" required className="input" placeholder="kilogram" />
      </div>
      <div>
        <label className="label" htmlFor="unit-symbol">
          Symbol
        </label>
        <input id="unit-symbol" name="symbol" required className="input" placeholder="kg" />
      </div>
      <div>
        <label className="label" htmlFor="unit-measureType">
          Measure type
        </label>
        <select id="unit-measureType" name="measureType" required className="input">
          <option value="MASS">MASS</option>
          <option value="VOLUME">VOLUME</option>
          <option value="COUNT">COUNT</option>
        </select>
      </div>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Adding..." : "Add unit"}
      </button>
    </form>
  );
}

export function NewConversionForm({
  units,
}: {
  units: Array<{ id: string; name: string; symbol: string }>;
}) {
  const [state, formAction, pending] = useActionState(createConversionAction, initialState);
  return (
    <form action={formAction} className="card space-y-3">
      <h2 className="text-sm font-semibold text-stone-900">Add a unit conversion</h2>
      <p className="text-xs text-stone-500">
        quantity_in_to = quantity_in_from &times; factor. The reverse direction is
        resolved automatically wherever this conversion is used.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="fromUnitId">
            From
          </label>
          <select id="fromUnitId" name="fromUnitId" required className="input">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="toUnitId">
            To
          </label>
          <select id="toUnitId" name="toUnitId" required className="input">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="factor">
          Factor
        </label>
        <input
          id="factor"
          name="factor"
          type="number"
          step="any"
          required
          className="input"
          placeholder="1000"
        />
      </div>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Adding..." : "Add conversion"}
      </button>
    </form>
  );
}
