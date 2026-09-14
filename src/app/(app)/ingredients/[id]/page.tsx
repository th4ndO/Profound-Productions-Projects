import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { loadConversionTable } from "@/lib/costing-db";
import {
  convert,
  edibleUnitCostCents,
  purchaseUnitCostCents,
  recipeUnitCostCents,
  MissingConversionError,
} from "@/costing";
import { formatRand } from "@/lib/money";
import { updateIngredientAction, addPriceAction } from "../actions";
import { EditIngredientForm } from "./edit-form";
import { AddPriceForm } from "./add-price-form";

export default async function IngredientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ingredient, units, conversions] = await Promise.all([
    prisma.ingredient.findUnique({
      where: { id },
      include: { prices: { orderBy: { effectiveFrom: "desc" } } },
    }),
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
    loadConversionTable(),
  ]);
  if (!ingredient) {
    notFound();
  }

  const unitById = new Map(units.map((u) => [u.id, u]));
  const purchaseUnit = unitById.get(ingredient.purchaseUnitId);
  const recipeUnit = unitById.get(ingredient.recipeUnitId);
  const latestPrice = ingredient.prices[0];

  let epError: string | null = null;
  let epCostDisplay: string | null = null;
  let apUnitCostDisplay: string | null = null;
  if (!latestPrice) {
    epError = `No price recorded for "${ingredient.name}" — costing anything that uses it will fail until a price is recorded (INV-1: never a silent zero).`;
  } else {
    try {
      const apUnitCost = purchaseUnitCostCents(latestPrice.priceCents, ingredient.purchaseQuantity);
      const factor = convert(1, ingredient.purchaseUnitId, ingredient.recipeUnitId, conversions);
      const recipeUnitAp = recipeUnitCostCents(apUnitCost, factor);
      const ep = edibleUnitCostCents(recipeUnitAp, ingredient.yieldPercent);
      apUnitCostDisplay = `${(apUnitCost / 100).toFixed(4)} R/${purchaseUnit?.symbol ?? "unit"}`;
      epCostDisplay = `${(ep / 100).toFixed(4)} R/${recipeUnit?.symbol ?? "unit"}`;
    } catch (err) {
      epError =
        err instanceof MissingConversionError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not derive a unit cost.";
    }
  }

  const boundUpdate = updateIngredientAction.bind(null, ingredient.id);
  const boundAddPrice = addPriceAction.bind(null, ingredient.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">{ingredient.name}</h1>
        <p className="text-sm text-stone-500">
          {ingredient.purchaseQuantity} {purchaseUnit?.symbol} per pack, used in recipes by the{" "}
          {recipeUnit?.symbol}, {ingredient.yieldPercent}% yield.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-stone-900">Derived unit cost</h2>
        {epError ? (
          <p className="alert-error">{epError}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-stone-500">Current price</dt>
              <dd className="font-medium">{latestPrice ? formatRand(latestPrice.priceCents) : "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">AP unit cost</dt>
              <dd className="font-medium">{apUnitCostDisplay}</dd>
            </div>
            <div>
              <dt className="text-stone-500">EP unit cost</dt>
              <dd className="font-medium">{epCostDisplay}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Yield</dt>
              <dd className="font-medium">{ingredient.yieldPercent}%</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EditIngredientForm
          action={boundUpdate}
          ingredient={{
            name: ingredient.name,
            purchaseUnitId: ingredient.purchaseUnitId,
            purchaseQuantity: ingredient.purchaseQuantity,
            recipeUnitId: ingredient.recipeUnitId,
            yieldPercent: ingredient.yieldPercent,
            supplier: ingredient.supplier,
          }}
          units={units}
        />
        <AddPriceForm action={boundAddPrice} purchaseUnitLabel={`${ingredient.purchaseQuantity} ${purchaseUnit?.symbol ?? ""}`} />
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-2 text-sm font-semibold text-stone-900">Price history</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Effective from</th>
              <th>Price</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {ingredient.prices.map((price) => (
              <tr key={price.id}>
                <td>{price.effectiveFrom.toISOString().slice(0, 10)}</td>
                <td>{formatRand(price.priceCents)}</td>
                <td>{price.source ?? "—"}</td>
              </tr>
            ))}
            {ingredient.prices.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-stone-400">
                  No price history yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
