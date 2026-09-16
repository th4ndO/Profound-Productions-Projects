import type { CategoryRuleTable } from "./types";

/**
 * Matches a transaction description against a table of category rules.
 *
 * - Matching is a case-insensitive substring test.
 * - If more than one rule matches, the rule with the LONGEST keyword wins
 *   (the more specific match), e.g. "coffee shop" beats "coffee".
 * - If no rule matches, returns null. The caller must surface this as
 *   "uncategorized" (INV-1) — never fall back to a default category.
 */
export function categorizeTransaction(
  description: string,
  rules: CategoryRuleTable,
): string | null {
  const haystack = description.toLowerCase();

  let bestCategoryId: string | null = null;
  let bestKeywordLength = -1;

  for (const rule of rules) {
    const keyword = rule.keyword.toLowerCase().trim();
    if (keyword.length === 0) continue;
    if (!haystack.includes(keyword)) continue;

    if (keyword.length > bestKeywordLength) {
      bestKeywordLength = keyword.length;
      bestCategoryId = rule.categoryId;
    }
  }

  return bestCategoryId;
}
