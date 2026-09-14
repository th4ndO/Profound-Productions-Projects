import { prisma } from "@/lib/db";
import { NewBatchForm } from "./new-batch-form";

export default async function NewBatchPage() {
  const recipes = await prisma.recipe.findMany({
    where: { isSubRecipe: false },
    orderBy: { name: "asc" },
  });
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-lg font-semibold text-stone-900">Plan a batch</h1>
      <NewBatchForm recipes={recipes} />
    </div>
  );
}
