"use client";

import { useActionState } from "react";
import { createCategoryAction, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function NewCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategoryAction, initialState);

  return (
    <form action={formAction} className="card flex flex-wrap items-end gap-2">
      <div className="flex-1">
        <label className="label" htmlFor="name">
          New category name
        </label>
        <input className="input" id="name" name="name" required placeholder="e.g. Textbooks" />
      </div>
      {state.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Adding..." : "Add category"}
      </button>
    </form>
  );
}
