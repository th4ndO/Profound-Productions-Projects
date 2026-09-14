import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildRecipeContext } from "@/lib/costing-db";
import { costRecipe, CostingError } from "@/costing";
import { formatRand } from "@/lib/money";

export default async function RecipesPage() {
  const [recipes, ctx] = await Promise.all([
    prisma.recipe.findMany({ orderBy: { name: "asc" } }),
    buildRecipeContext(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Recipes</h1>
          <p className="text-sm text-stone-500">
            Cost is computed live from current ingredient prices — a recipe
            that can't be costed shows why, never a zero.
          </p>
        </div>
        <Link href="/recipes/new" className="btn-primary">
          Add recipe
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Standard yield</th>
              <th>Total cost</th>
              <th>Cost per unit</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((recipe) => {
              let totalDisplay: React.ReactNode = "—";
              let unitDisplay: React.ReactNode = "—";
              try {
                const cost = costRecipe(recipe.id, ctx);
                totalDisplay = formatRand(cost.totalCents);
                unitDisplay = formatRand(cost.unitCents);
              } catch (err) {
                const message = err instanceof CostingError ? err.message : "cannot be costed";
                totalDisplay = <span className="text-red-600">{message}</span>;
              }
              return (
                <tr key={recipe.id}>
                  <td>
                    <Link href={`/recipes/${recipe.id}`} className="text-brand-700 hover:underline">
                      {recipe.name}
                    </Link>
                  </td>
                  <td>{recipe.isSubRecipe ? "Sub-recipe" : "Recipe"}</td>
                  <td>{recipe.standardYieldQty}</td>
                  <td>{totalDisplay}</td>
                  <td>{unitDisplay}</td>
                </tr>
              );
            })}
            {recipes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-stone-400">
                  No recipes yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
