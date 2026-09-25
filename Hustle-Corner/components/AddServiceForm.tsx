"use client";

import { useActionState, useRef } from "react";
import { addService } from "@/app/dashboard/actions";

export default function AddServiceForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => {
      const result = await addService(formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-xs text-gray-500">
          Service name
        </label>
        <input id="name" name="name" placeholder="e.g. Box braids" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
      </div>
      <div className="flex gap-2">
        <div className="w-1/2">
          <label htmlFor="priceFrom" className="mb-1 block text-xs text-gray-500">
            Price from (R)
          </label>
          <input
            id="priceFrom"
            name="priceFrom"
            type="number"
            placeholder="250"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="w-1/2">
          <label htmlFor="priceTo" className="mb-1 block text-xs text-gray-500">
            Price to (optional)
          </label>
          <input
            id="priceTo"
            name="priceTo"
            type="number"
            placeholder="400"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add service"}
      </button>
    </form>
  );
}
