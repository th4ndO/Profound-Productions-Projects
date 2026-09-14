"use client";

import { useActionState } from "react";
import { deleteIngredientAction, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function DeleteIngredientButton({ ingredientId }: { ingredientId: string }) {
  const action = deleteIngredientAction.bind(null, ingredientId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <button type="submit" disabled={pending} className="btn-danger">
        {pending ? "Deleting..." : "Delete ingredient"}
      </button>
      {state.error ? <p className="alert-error max-w-md">{state.error}</p> : null}
    </form>
  );
}
