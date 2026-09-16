import { requireUser } from "@/lib/session-guard";
import { getUserCategories } from "@/lib/categories";
import { getUserPeriods } from "@/lib/periods";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import { ManualTransactionForm } from "./ManualTransactionForm";
import { CsvImportForm } from "./CsvImportForm";
import { CategorySelect } from "./CategorySelect";

export default async function TransactionsPage() {
  const user = await requireUser();
  const [categories, periods, transactions] = await Promise.all([
    getUserCategories(user.id),
    getUserPeriods(user.id),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const periodOptions = periods.map((p) => ({ id: p.id, name: p.name }));
  const uncategorizedTotal = transactions
    .filter((t) => t.categoryId === null)
    .reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Transactions</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ManualTransactionForm periods={periodOptions} />
        <CsvImportForm periods={periodOptions} />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">All transactions</h2>
          {uncategorizedTotal > 0 ? (
            <span className="badge badge-uncategorized">
              <Money cents={uncategorizedTotal} /> uncategorized
            </span>
          ) : null}
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet. Add one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Amount</th>
                  <th className="py-2 pr-2">Source</th>
                  <th className="py-2 pr-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-2 text-slate-600">
                      {t.occurredAt.toLocaleDateString("en-ZA")}
                    </td>
                    <td className="py-2 pr-2">{t.description}</td>
                    <td className="whitespace-nowrap py-2 pr-2">
                      <Money cents={t.amountCents} />
                    </td>
                    <td className="py-2 pr-2 text-xs text-slate-500">{t.source}</td>
                    <td className="py-2 pr-2">
                      <CategorySelect
                        transactionId={t.id}
                        categoryId={t.categoryId}
                        categories={categoryOptions}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
