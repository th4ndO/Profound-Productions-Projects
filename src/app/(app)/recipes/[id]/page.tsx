import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildRecipeContext } from "@/lib/costing-db";
import { costRecipe, CostingError } from "@/costing";
import { formatRand } from "@/lib/money";
import { addLineAction, deleteLineAction, updateRecipeAction } from "../actions";
import { EditRecipeForm } from "./edit-form";
import { AddLineForm } from "./add-line-form";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, units, ingredients, otherRecipes, ctx] = await Promise.all([
    prisma.recipe.findUnique({ where: { id } }),
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    prisma.recipe.findMany({ orderBy: { name: "asc" } }),
    buildRecipeContext(),
  ]);
  if (!recipe) {
    notFound();
  }

  const unitById = new Map(units.map((u) => [u.id, u]));
  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
  const recipeById = new Map(otherRecipes.map((r) => [r.id, r]));
  const lines = ctx.recipes.get(recipe.id)?.lines ?? [];

  let costError: string | null = null;
  let cost: ReturnType<typeof costRecipe> | null = null;
  try {
    cost = costRecipe(recipe.id, ctx);
  } catch (err) {
    costError = err instanceof CostingError ? err.message : "This recipe cannot be costed.";
  }
  const lineCostById = new Map((cost?.lines ?? []).map((l) => [l.lineId, l.lineCostCents]));

  const boundUpdate = updateRecipeAction.bind(null, recipe.id);
  const boundAddLine = addLineAction.bind(null, recipe.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">{recipe.name}</h1>
        <p className="text-sm text-stone-500">
          Standard yield {recipe.standardYieldQty} {unitById.get(recipe.yieldUnitId)?.symbol}
          {recipe.isSubRecipe ? " · sub-recipe" : ""}
        </p>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-2 text-sm font-semibold text-stone-900">Costing sheet</h2>
        {costError ? (
          <p className="alert-error">{costError}</p>
        ) : null}

        <table className="table-base">
          <thead>
            <tr>
              <th>Line</th>
              <th>Quantity</th>
              <th>Line cost</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const label = line.ingredientId
                ? ingredientById.get(line.ingredientId)?.name ?? "Unknown ingredient"
                : `${recipeById.get(line.childRecipeId ?? "")?.name ?? "Unknown recipe"} (sub-recipe)`;
              const lineCost = lineCostById.get(line.id);
              return (
                <tr key={line.id}>
                  <td>{label}</td>
                  <td>
                    {line.quantity} {unitById.get(line.unitId)?.symbol}
                  </td>
                  <td>{lineCost !== undefined ? formatRand(lineCost) : "—"}</td>
                  <td>
                    <form action={deleteLineAction.bind(null, recipe.id, line.id)}>
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-stone-400">
                  No lines yet.
                </td>
              </tr>
            ) : null}
          </tbody>
          {cost ? (
            <tfoot>
              <tr>
                <td colSpan={2} className="text-right font-medium">
                  Subtotal
                </td>
                <td className="font-medium">{formatRand(cost.totalCents)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={2} className="text-right text-stone-500">
                  Incidentals ({recipe.incidentalsRate}%)
                </td>
                <td className="text-stone-500">{formatRand(cost.appliedIncidentalsCents)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={2} className="text-right font-semibold">
                  Cost per {unitById.get(recipe.yieldUnitId)?.symbol}
                </td>
                <td className="font-semibold">{formatRand(cost.unitCents)}</td>
                <td></td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EditRecipeForm
          action={boundUpdate}
          recipe={{
            name: recipe.name,
            standardYieldQty: recipe.standardYieldQty,
            yieldUnitId: recipe.yieldUnitId,
            incidentalsRate: recipe.incidentalsRate,
            isSubRecipe: recipe.isSubRecipe,
          }}
          units={units}
        />
        <AddLineForm
          action={boundAddLine}
          ingredients={ingredients}
          recipes={otherRecipes}
          units={units}
        />
      </div>
    </div>
  );
}
