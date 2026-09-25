"use client";

import { useActionState } from "react";
import { updateMicrosite } from "@/app/dashboard/actions";
import type { SellerDetail } from "@/lib/sellers";

export default function MicrositeForm({ seller }: { seller: SellerDetail }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => updateMicrosite(formData),
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input
        name="tagline"
        defaultValue={seller.micrositeTagline ?? ""}
        placeholder="Tagline, e.g. Braids done right, every time"
        maxLength={80}
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      <label className="flex items-center gap-2 text-sm text-gray-600">
        Accent color
        <input
          type="color"
          name="themeColor"
          defaultValue={seller.micrositeThemeColor ?? "#0f4c81"}
          className="h-9 w-14 rounded border border-gray-300"
        />
      </label>
      <textarea
        name="story"
        defaultValue={seller.micrositeStory ?? ""}
        placeholder="Your story — how you started, what makes you different (max 1000 characters)"
        rows={5}
        maxLength={1000}
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-6 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save micro-site"}
      </button>
    </form>
  );
}
