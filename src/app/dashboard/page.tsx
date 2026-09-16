import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { getCurrentOpenPeriod, getPeriodDashboard } from "@/lib/periods";
import { Money } from "@/components/Money";

export default async function DashboardPage() {
  const user = await requireUser();
  const period = await getCurrentOpenPeriod(user.id);

  if (!period) {
    return (
      <div className="card">
        <h1 className="mb-2 text-lg font-semibold">No open budget period yet</h1>
        <p className="mb-4 text-sm text-slate-600">
          Create a budget period to start tracking income, spend, and a forecast.
        </p>
        <Link href="/periods" className="btn">
          Create a period
        </Link>
      </div>
    );
  }

  const dashboard = await getPeriodDashboard(period.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{dashboard.period.name}</h1>
        <p className="text-sm text-slate-500">
          {dashboard.period.startDate.toLocaleDateString("en-ZA")} –{" "}
          {dashboard.period.endDate.toLocaleDateString("en-ZA")}
          {" · "}
          <Link href={`/periods/${dashboard.period.id}`} className="underline">
            view period details
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Income so far</p>
          <p className="mt-1 text-2xl font-semibold text-brand-700">
            <Money cents={dashboard.incomeCents} />
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Spend so far</p>
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
          <p className="text-xs uppercase tracking-wide text-slate-500">Balance</p>
          <p className="mt-1 text-2xl font-semibold">
            <Money cents={dashboard.balanceCents} />
          </p>
        </div>
      </div>

      {dashboard.forecast ? (
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Forecast</h2>
          {dashboard.forecast.daysUntilExhausted !== null ? (
            <p className="text-2xl font-semibold">
              {dashboard.forecast.daysUntilExhausted} days until your balance runs out
            </p>
          ) : (
            <p className="text-lg text-slate-600">
              You have not spent anything in the trailing window, so there is no exhaustion
              forecast to show.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Method: trailing {dashboard.forecast.windowDays}-day average burn rate of{" "}
            <Money cents={dashboard.forecast.burnRateCentsPerDay} />/day, computed live as of{" "}
            {dashboard.forecast.asOf.toLocaleString("en-ZA")}. This is a forecast, not a
            guarantee — it is recalculated every time you view this page from current data,
            never cached.
          </p>
        </div>
      ) : (
        <div className="card bg-slate-50">
          <p className="text-sm text-slate-600">
            This period is closed. Its totals above are frozen from when it was closed and will
            never change, even if transactions are added or recategorized afterward.
          </p>
        </div>
      )}
    </div>
  );
}
