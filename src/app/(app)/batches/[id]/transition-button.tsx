"use client";

import { useActionState } from "react";
import { advanceBatchStatusAction, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function TransitionButton({
  batchId,
  targetStatus,
  label,
  variant = "primary",
}: {
  batchId: string;
  targetStatus: string;
  label: string;
  variant?: "primary" | "danger";
}) {
  const action = advanceBatchStatusAction.bind(null, batchId, targetStatus);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <button
        type="submit"
        disabled={pending}
        className={variant === "danger" ? "btn-danger" : "btn-primary"}
      >
        {pending ? "Working..." : label}
      </button>
      {state.error ? <p className="alert-error">{state.error}</p> : null}
    </form>
  );
}
