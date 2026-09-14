import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildRecipeContext } from "@/lib/costing-db";
import { costRecipe, foodCostPercent, marginPercent, CostingError } from "@/costing";
import { formatPercent, formatRand } from "@/lib/money";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  const canSeeMargin = user?.role === "ADMIN" || user?.role === "BUYER";

  const [products, ctx] = await Promise.all([
    prisma.product.findMany({ include: { recipe: true }, orderBy: { recipe: { name: "asc" } } }),
    buildRecipeContext(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Products</h1>
          <p className="text-sm text-stone-500">Selling prices, margin and food-cost percentage.</p>
        </div>
        {canSeeMargin ? (
          <Link href="/products/new" className="btn-primary">
            Add product
          </Link>
        ) : null}
      </div>

      {!canSeeMargin ? (
        <p className="alert-warn">
          Margin and food-cost figures are restricted to ADMIN and BUYER roles. Signed in as{" "}
          {user?.role}.
        </p>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Product</th>
              <th>Selling price</th>
              {canSeeMargin ? <th>Unit cost</th> : null}
              {canSeeMargin ? <th>Margin</th> : null}
              {canSeeMargin ? <th>Food cost</th> : null}
              <th>Min margin</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              let marginCell: React.ReactNode = "—";
              let foodCostCell: React.ReactNode = "—";
              let unitCostCell: React.ReactNode = "—";
              if (canSeeMargin) {
                try {
                  const cost = costRecipe(product.recipeId, ctx);
                  unitCostCell = formatRand(cost.unitCents);
                  const margin = marginPercent(cost.unitCents, product.sellingPriceCents);
                  const foodCost = foodCostPercent(cost.unitCents, product.sellingPriceCents);
                  const belowThreshold = margin < product.minMarginPercent;
                  marginCell = (
                    <span className={belowThreshold ? "text-red-600 font-medium" : undefined}>
                      {formatPercent(margin)}
                    </span>
                  );
                  foodCostCell = formatPercent(foodCost);
                } catch (err) {
                  const message = err instanceof CostingError ? err.message : "cannot be costed";
                  unitCostCell = <span className="text-red-600">{message}</span>;
                }
              }
              return (
                <tr key={product.id}>
                  <td>
                    <Link href={`/products/${product.id}`} className="text-brand-700 hover:underline">
                      {product.recipe.name}
                    </Link>
                  </td>
                  <td>{formatRand(product.sellingPriceCents)}</td>
                  {canSeeMargin ? <td>{unitCostCell}</td> : null}
                  {canSeeMargin ? <td>{marginCell}</td> : null}
                  {canSeeMargin ? <td>{foodCostCell}</td> : null}
                  <td>{formatPercent(product.minMarginPercent)}</td>
                  <td>{product.active ? "Yes" : "No"}</td>
                </tr>
              );
            })}
            {products.length === 0 ? (
              <tr>
                <td colSpan={canSeeMargin ? 7 : 4} className="py-6 text-center text-stone-400">
                  No products yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
