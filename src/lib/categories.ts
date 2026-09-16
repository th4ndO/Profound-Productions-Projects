import type { CategoryRuleTable } from "@/budgeting";
import { prisma } from "./prisma";

/** Every category-matching rule for a user, in the shape categorizeTransaction() expects. */
export async function getUserRuleTable(userId: string): Promise<CategoryRuleTable> {
  const categories = await prisma.category.findMany({
    where: { userId },
    include: { rules: true },
  });

  return categories.flatMap((category) =>
    category.rules.map((rule) => ({
      id: rule.id,
      categoryId: category.id,
      keyword: rule.keyword,
    })),
  );
}

export async function getUserCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    include: { rules: true },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(userId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name cannot be empty");
  return prisma.category.create({ data: { userId, name: trimmed } });
}

export async function addCategoryRule(categoryId: string, keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) throw new Error("Keyword cannot be empty");
  return prisma.categoryRule.create({ data: { categoryId, keyword: trimmed } });
}

export async function deleteCategoryRule(ruleId: string) {
  return prisma.categoryRule.delete({ where: { id: ruleId } });
}
