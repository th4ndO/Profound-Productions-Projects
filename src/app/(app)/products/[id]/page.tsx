import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { costRecipeById } from "@/lib/costing-db";
import { foodCostPercent, marginPercent, CostingError } from "@/costing";
import { formatPercent, formatRand } from "@/lib/money";
import { updateProductAction } from "../actions";
import { EditProductForm } from "./edit-form";
import { SuggestedPriceCalculator } from "./suggested-price";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, user] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { recipe: true } }),
    getCurrentUser(),
  ]);
  if (!product) {
    notFound();
  }

  const canSeeMargin = user?.role === "ADMIN" || user?.role === "BUYER";
  if (!canSeeMargin) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-lg font-semibold text-stone-900">{product.recipe.name}</h1>
        <p className="alert-warn">
          Margin and pricing detail are restricted to ADMIN and BUYER roles.
        </p>
      </div>
    );
  }

  let costError: string | null = null;
  let unitCents: number | null = null;
  let margin: number | null = null;
  let foodCost: number | null = null;
  try {
    const cost = await costRecipeById(product.recipeId);
    unitCents = cost.unitCents;
    margin = marginPercent(cost.unitCents, product.sellingPriceCents);
    foodCost = foodCostPercent(cost.unitCents, product.sellingPriceCents);
  } catch (err) {
    costError = err instanceof CostingError ? err.message : "This product's recipe cannot be costed.";
  }

  const boundUpdate = updateProductAction.bind(null, product.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">{product.recipe.name}</h1>
        <p className="text-sm text-stone-500">Selling price {formatRand(product.sellingPriceCents)}</p>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold text-stone-900">Margin</h2>
        {costError ? (
          <p className="alert-error">{costError}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-stone-500">Unit cost</dt>
              <dd className="font-medium">{formatRand(unitCents ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Margin</dt>
              <dd
                className={`font-medium ${
                  margin !== null && margin < product.minMarginPercent ? "text-red-600" : ""
                }`}
              >
                {margin !== null ? formatPercent(margin) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Food cost</dt>
              <dd className="font-medium">{foodCost !== null ? formatPercent(foodCost) : "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Minimum margin threshold</dt>
              <dd className="font-medium">{formatPercent(product.minMarginPercent)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EditProductForm
          action={boundUpdate}
          product={{
            sellingPriceCents: product.sellingPriceCents,
            minMarginPercent: product.minMarginPercent,
            active: product.active,
          }}
        />
        {unitCents !== null ? <SuggestedPriceCalculator unitCostCents={unitCents} /> : null}
      </div>
    </div>
  );
}
