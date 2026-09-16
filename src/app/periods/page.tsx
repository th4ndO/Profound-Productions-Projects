import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { getUserPeriods } from "@/lib/periods";
import { Money } from "@/components/Money";
import { NewPeriodForm } from "./NewPeriodForm";

export default async function PeriodsPage() {
  const user = await requireUser();
  const periods = await getUserPeriods(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Budget periods</h1>

      <NewPeriodForm />

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">All periods</h2>
        {periods.length === 0 ? (
          <p className="text-sm text-slate-500">No periods yet — create one above.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {periods.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/periods/${p.id}`} className="font-medium text-brand-700 hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {p.startDate.toLocaleDateString("en-ZA")} – {p.endDate.toLocaleDateString("en-ZA")}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {p.closed ? (
                    <span className="badge bg-slate-200 text-slate-700">
                      Closed · balance <Money cents={p.frozenEndBalanceCents ?? 0} />
                    </span>
                  ) : (
                    <span className="badge bg-brand-100 text-brand-700">Open</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
