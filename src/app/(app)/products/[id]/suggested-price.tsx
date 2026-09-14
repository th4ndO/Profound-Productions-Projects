"use client";

import { useState } from "react";
import { suggestedPriceCents, InvalidPriceError } from "@/costing";
import { formatRand } from "@/lib/money";

/**
 * Client-side suggested-price calculator. Safe to call the pure costing
 * function directly in the browser bundle — src/costing/ has no server-only
 * dependency, which is exactly the portability property the module is
 * designed to keep.
 */
export function SuggestedPriceCalculator({ unitCostCents }: { unitCostCents: number }) {
  const [target, setTarget] = useState("35");
  let result: string;
  try {
    const targetNumber = Number(target);
    if (!Number.isFinite(targetNumber) || targetNumber <= 0) {
      result = "Enter a target food cost % greater than 0.";
    } else {
      result = formatRand(suggestedPriceCents(unitCostCents, targetNumber));
    }
  } catch (err) {
    result = err instanceof InvalidPriceError ? err.message : "Could not compute a price.";
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold text-stone-900">Suggested price calculator</h2>
      <div>
        <label className="label" htmlFor="target-food-cost">
          Target food cost %
        </label>
        <input
          id="target-food-cost"
          type="number"
          step="any"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="input"
        />
      </div>
      <p className="text-sm text-stone-600">
        Suggested selling price: <span className="font-semibold text-stone-900">{result}</span>
      </p>
    </div>
  );
}
