import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const [ingredientCount, recipeCount, productCount, activeBatchCount, openAlertCount] =
    await Promise.all([
      prisma.ingredient.count(),
      prisma.recipe.count(),
      prisma.product.count(),
      prisma.batch.count({ where: { status: { in: ["PLANNED", "IN_PRODUCTION", "COMPLETED"] } } }),
      prisma.marginAlert.count({ where: { acknowledged: false } }),
    ]);

  const tiles: Array<{ label: string; value: number; href: string }> = [
    { label: "Ingredients", value: ingredientCount, href: "/ingredients" },
    { label: "Recipes", value: recipeCount, href: "/recipes" },
    { label: "Products", value: productCount, href: "/products" },
    { label: "Open batches", value: activeBatchCount, href: "/batches" },
    { label: "Unacknowledged alerts", value: openAlertCount, href: "/alerts" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500">
          Costing is computed live from current ingredient prices — nothing here is cached.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="card hover:border-brand-600">
            <div className="text-2xl font-semibold text-stone-900">{tile.value}</div>
            <div className="text-sm text-stone-500">{tile.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
