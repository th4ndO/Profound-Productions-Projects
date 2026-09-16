import { requireUser } from "@/lib/session-guard";
import { getUserCategories } from "@/lib/categories";
import { NewCategoryForm } from "./NewCategoryForm";
import { addRuleAction, deleteRuleAction } from "./actions";

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await getUserCategories(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Categories &amp; rules</h1>
      <p className="text-sm text-slate-600">
        A transaction is matched to a category when its description contains one of that
        category&apos;s keywords (case-insensitive). The longest matching keyword wins if more
        than one matches. No match means the transaction stays uncategorized — it is still
        counted in every total, never dropped.
      </p>

      <NewCategoryForm />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="card">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {category.name}
              {category.isSystem ? (
                <span className="ml-2 badge bg-slate-100 text-slate-500">default</span>
              ) : null}
            </h2>

            <ul className="mb-3 space-y-1">
              {category.rules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between text-sm">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs">
                    {rule.keyword}
                  </span>
                  <form action={deleteRuleAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      remove
                    </button>
                  </form>
                </li>
              ))}
              {category.rules.length === 0 ? (
                <li className="text-xs text-slate-400">No keywords yet.</li>
              ) : null}
            </ul>

            <form action={addRuleAction} className="flex gap-2">
              <input type="hidden" name="categoryId" value={category.id} />
              <input
                className="input flex-1"
                name="keyword"
                placeholder="add a keyword"
                required
              />
              <button type="submit" className="btn-secondary">
                Add
              </button>
            </form>
          </div>
        ))}
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">No categories yet — add one above.</p>
      ) : null}
    </div>
  );
}
