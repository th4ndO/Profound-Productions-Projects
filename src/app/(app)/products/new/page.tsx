import { prisma } from "@/lib/db";
import { NewProductForm } from "./new-product-form";

export default async function NewProductPage() {
  const recipes = await prisma.recipe.findMany({
    where: { isSubRecipe: false, product: null },
    orderBy: { name: "asc" },
  });
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-lg font-semibold text-stone-900">Add product</h1>
      <NewProductForm recipes={recipes} />
    </div>
  );
}
