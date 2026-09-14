import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { scaleRecipeById, purchaseListForBatch } from "@/lib/costing-db";
import { CostingError } from "@/costing";
import { formatRand } from "@/lib/money";
import { allowedNextStatuses } from "../batch-status";
import { TransitionButton } from "./transition-button";

const STATUS_LABELS: Record<string, string> = {
  IN_PRODUCTION: "Start production",
  COMPLETED: "Mark completed",
  COSTED: "Cost and freeze",
  CANCELLED: "Cancel batch",
};

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      recipe: { include: { yieldUnit: true } },
      lines: { include: { ingredient: true } },
    },
  });
  if (!batch) {
    notFound();
  }

  const isFrozen = batch.status === "COSTED";
  const nextStatuses = allowedNextStatuses(batch.status);

  let scaleError: string | null = null;
  let scaledSummary: Array<{ ingredientName: string; quantity: number; unitId: string }> = [];
  let purchaseRows: Awaited<ReturnType<typeof purchaseListForBatch>> = [];
  if (!isFrozen) {
    try {
      const scaled = await scaleRecipeById(batch.recipeId, batch.targetYield);
      const byIngredient = new Map<string, { ingredientName: string; quantity: number; unitId: string }>();
      for (const line of scaled) {
        const existing = byIngredient.get(line.ingredientId);
        if (existing) {
          existing.quantity += line.quantity;
        } else {
          byIngredient.set(line.ingredientId, {
            ingredientName: line.ingredientName,
            quantity: line.quantity,
            unitId: line.unitId,
          });
        }
      }
      scaledSummary = [...byIngredient.values()];
      purchaseRows = await purchaseListForBatch(batch.recipeId, batch.targetYield);
    } catch (err) {
      scaleError = err instanceof CostingError ? err.message : "This batch cannot be scaled.";
    }
  }

  const units = await prisma.unit.findMany();
  const unitById = new Map(units.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">{batch.recipe.name}</h1>
          <p className="text-sm text-stone-500">
            Target yield {batch.targetYield} {batch.recipe.yieldUnit.symbol} · planned for{" "}
            {batch.plannedFor.toISOString().slice(0, 10)} · status{" "}
            <span className="badge bg-stone-100 text-stone-700">{batch.status}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <TransitionButton
              key={status}
              batchId={batch.id}
              targetStatus={status}
              label={STATUS_LABELS[status] ?? status}
              variant={status === "CANCELLED" ? "danger" : "primary"}
            />
          ))}
        </div>
      </div>

      {isFrozen ? (
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-stone-900">
            Frozen cost (INV-3 — never recomputed)
          </h2>
          <p className="mb-3 text-xs text-stone-500">
            Costed at {batch.costedAt?.toISOString()}. These figures were
            captured at that moment and will not change even if ingredient
            prices change afterwards.
          </p>
          <dl className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Total cost</dt>
              <dd className="font-semibold">{formatRand(batch.costedTotalCents ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Cost per unit</dt>
              <dd className="font-semibold">{formatRand(batch.costedUnitCents ?? 0)}</dd>
            </div>
          </dl>
          <table className="table-base">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Scaled quantity</th>
                <th>Frozen unit cost</th>
                <th>Line cost</th>
              </tr>
            </thead>
            <tbody>
              {batch.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.ingredient.name}</td>
                  <td>
                    {line.scaledQuantity} {unitById.get(line.ingredient.recipeUnitId)?.symbol}
                  </td>
                  <td>{formatRand(line.unitCostCents)}</td>
                  <td>{formatRand(line.lineCostCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {scaleError ? <p className="alert-error">{scaleError}</p> : null}
          {!scaleError ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card overflow-x-auto">
                <h2 className="mb-2 text-sm font-semibold text-stone-900">
                  Scaled quantity sheet (live)
                </h2>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Quantity needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaledSummary.map((row) => (
                      <tr key={row.ingredientName}>
                        <td>{row.ingredientName}</td>
                        <td>
                          {row.quantity.toFixed(2)} {unitById.get(row.unitId)?.symbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card overflow-x-auto">
                <h2 className="mb-2 text-sm font-semibold text-stone-900">
                  Purchase list (packs to buy)
                </h2>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Required (AP)</th>
                      <th>Packs to buy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRows.map((row) => (
                      <tr key={row.ingredientId}>
                        <td>{row.ingredientName}</td>
                        <td>
                          {row.requiredApQuantity.toFixed(2)}{" "}
                          {unitById.get(row.purchaseUnitId)?.symbol}
                        </td>
                        <td>{row.packsToBuy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
