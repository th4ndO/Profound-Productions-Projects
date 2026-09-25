"use client";

import { useActionState } from "react";
import { updateSellerBasicInfo } from "@/app/dashboard/actions";
import type { SellerDetail } from "@/lib/sellers";

export default function EditBasicInfoForm({ seller }: { seller: SellerDetail }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => updateSellerBasicInfo(formData),
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="businessName" className="mb-1.5 block text-sm font-medium text-gray-700">
          Business name
        </label>
        <input
          id="businessName"
          name="businessName"
          defaultValue={seller.businessName}
          placeholder="Business name"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={seller.bio ?? ""}
          placeholder="Bio"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="areaNote" className="mb-1.5 block text-sm font-medium text-gray-700">
          Area
        </label>
        <input
          id="areaNote"
          name="areaNote"
          defaultValue={seller.areaNote ?? ""}
          placeholder="Area"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="instagramHandle" className="mb-1.5 block text-sm font-medium text-gray-700">
          Instagram
        </label>
        <input
          id="instagramHandle"
          name="instagramHandle"
          defaultValue={seller.instagramHandle ?? ""}
          placeholder="Instagram handle"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="whatsappNumber" className="mb-1.5 block text-sm font-medium text-gray-700">
          WhatsApp number
        </label>
        <input
          id="whatsappNumber"
          name="whatsappNumber"
          defaultValue={seller.whatsappNumber}
          placeholder="WhatsApp number"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-6 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
