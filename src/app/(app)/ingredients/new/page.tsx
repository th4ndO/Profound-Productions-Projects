import { prisma } from "@/lib/db";
import { NewIngredientForm } from "./new-ingredient-form";

export default async function NewIngredientPage() {
  const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-lg font-semibold text-stone-900">Add ingredient</h1>
      <NewIngredientForm units={units} />
    </div>
  );
}
