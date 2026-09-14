import { prisma } from "@/lib/db";
import { NewRecipeForm } from "./new-recipe-form";

export default async function NewRecipePage() {
  const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-lg font-semibold text-stone-900">Add recipe</h1>
      <NewRecipeForm units={units} />
    </div>
  );
}
