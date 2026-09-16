"use client";

import { useRef } from "react";
import { recategorizeAction } from "./actions";

export function CategorySelect({
  transactionId,
  categoryId,
  categories,
}: {
  transactionId: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={recategorizeAction}>
      <input type="hidden" name="transactionId" value={transactionId} />
      <select
        className="input py-1 text-xs"
        name="categoryId"
        defaultValue={categoryId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="">Uncategorized</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </form>
  );
}
