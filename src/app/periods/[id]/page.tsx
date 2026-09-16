import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { getPeriodDashboard } from "@/lib/periods";
import { Money } from "@/components/Money";
import { closePeriodAction } from "../actions";

export default async function PeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const dashboard = await getPeriodDashboard(id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/periods" className="text-sm text-slate-500 hover:underline">
          ← All periods
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{dashboard.period.name}</h1>
        <p className="text-sm text-slate-500">
          {dashboard.period.startDate.toLocaleDateString("en-ZA")} –{" "}
          {dashboard.period.endDate.toLocaleDateString("en-ZA")}
        </p>
      </div>

      {dashboard.period.closed ? (
        <div className="card border-slate-300 bg-slate-50">
          <p className="text-sm font-medium text-slate-700">
            This period was closed on{" "}
            {dashboard.period.closedAt?.toLocaleString("en-ZA") ?? "—"}.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            The figures below are frozen exactly as computed at that moment. Adding a backdated
            transaction, editing a category&apos;s rules, or recategorizing a transaction now will
            never change these numbers — only a currently open period&apos;s live figures can move.
          </p>
        </div>
      ) : (
        <form action={closePeriodAction} className="card flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Closing this period freezes its totals forever. This cannot be undone.
          </p>
          <input type="hidden" name="periodId" value={dashboard.period.id} />
          <button type="submit" className="btn-secondary">
            Close this period
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {dashboard.period.closed ? "Frozen income" : "Income so far"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-brand-700">
            <Money cents={dashboard.incomeCents} />
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {dashboard.period.closed ? "Frozen spend" : "Spend so far"}
          </p>
          <p className="mt-1 text-2xl font-semibold">
            <Money cents={dashboard.spendCents} />
          </p>
          {dashboard.uncategorizedSpendCents > 0 ? (
            <p className="badge badge-uncategorized mt-2">
              <Money cents={dashboard.uncategorizedSpendCents} /> uncategorized
            </p>
          ) : null}
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {dashboard.period.closed ? "Frozen ending balance" : "Balance"}
          </p>
          <p className="mt-1 text-2xl font-semibold">
            <Money cents={dashboard.balanceCents} />
          </p>
        </div>
      </div>

      {dashboard.forecast ? (
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Forecast</h2>
          {dashboard.forecast.daysUntilExhausted !== null ? (
            <p className="text-xl font-semibold">
              {dashboard.forecast.daysUntilExhausted} days until your balance runs out
            </p>
          ) : (
            <p className="text-slate-600">No spend in the trailing window — no forecast to show.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Method: trailing {dashboard.forecast.windowDays}-day average burn rate of{" "}
            <Money cents={dashboard.forecast.burnRateCentsPerDay} />/day, as of{" "}
            {dashboard.forecast.asOf.toLocaleString("en-ZA")}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
