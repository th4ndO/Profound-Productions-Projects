import Link from "next/link";
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

export default async function IngredientsPage() {
  const [ingredients, units, conversions] = await Promise.all([
    prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      include: { prices: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
    }),
    prisma.unit.findMany(),
    loadConversionTable(),
  ]);
  const unitById = new Map(units.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Ingredients</h1>
          <p className="text-sm text-stone-500">
            Current price and the derived edible-portion (EP) unit cost — the
            figure recipes actually cost against.
          </p>
        </div>
        <Link href="/ingredients/new" className="btn-primary">
          Add ingredient
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Purchase</th>
              <th>Recipe unit</th>
              <th>Yield</th>
              <th>Current price</th>
              <th>EP unit cost</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => {
              const recipeUnit = unitById.get(ingredient.recipeUnitId);
              const purchaseUnit = unitById.get(ingredient.purchaseUnitId);
              const latestPrice = ingredient.prices[0];

              let epCostDisplay = "—";
              if (latestPrice) {
                try {
                  const apUnitCost = purchaseUnitCostCents(
                    latestPrice.priceCents,
                    ingredient.purchaseQuantity,
                  );
                  const factor = convert(
                    1,
                    ingredient.purchaseUnitId,
                    ingredient.recipeUnitId,
                    conversions,
                  );
                  const recipeUnitAp = recipeUnitCostCents(apUnitCost, factor);
                  const ep = edibleUnitCostCents(recipeUnitAp, ingredient.yieldPercent);
                  epCostDisplay = `${(ep / 100).toFixed(4)} R/${recipeUnit?.symbol ?? "unit"}`;
                } catch (err) {
                  epCostDisplay =
                    err instanceof MissingConversionError ? "no conversion path" : "error";
                }
              }

              return (
                <tr key={ingredient.id}>
                  <td>
                    <Link href={`/ingredients/${ingredient.id}`} className="text-brand-700 hover:underline">
                      {ingredient.name}
                    </Link>
                  </td>
                  <td>
                    {ingredient.purchaseQuantity} {purchaseUnit?.symbol}
                  </td>
                  <td>{recipeUnit?.symbol}</td>
                  <td>{ingredient.yieldPercent}%</td>
                  <td>{latestPrice ? formatRand(latestPrice.priceCents) : <span className="text-red-600">no price recorded</span>}</td>
                  <td>{epCostDisplay}</td>
                </tr>
              );
            })}
            {ingredients.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-stone-400">
                  No ingredients yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
