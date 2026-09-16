import { requireUser } from "@/lib/session-guard";
import { getUserSavingsGoals, getSavingsGoalStatus } from "@/lib/savingsGoals";
import { InvalidGoalError } from "@/budgeting";
import { Money } from "@/components/Money";
import { NewGoalForm } from "./NewGoalForm";
import { addContributionAction } from "./actions";

export default async function SavingsPage() {
  const user = await requireUser();
  const goals = await getUserSavingsGoals(user.id);

  const statuses = await Promise.all(
    goals.map(async (goal) => {
      try {
        return { goal, status: await getSavingsGoalStatus(goal.id), overdue: false as const };
      } catch (error) {
        if (error instanceof InvalidGoalError) {
          return { goal, status: null, overdue: true as const };
        }
        throw error;
      }
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Savings goals</h1>

      <NewGoalForm />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {statuses.map(({ goal, status, overdue }) => (
          <div key={goal.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">{goal.name}</h2>
              {overdue ? (
                <span className="badge bg-red-100 text-red-700">overdue &amp; unmet</span>
              ) : status?.onPace ? (
                <span className="badge bg-brand-100 text-brand-700">on pace</span>
              ) : (
                <span className="badge bg-amber-100 text-amber-800">behind pace</span>
              )}
            </div>

            <p className="text-sm text-slate-600">
              Target <Money cents={goal.targetCents} /> by{" "}
              {goal.targetDate.toLocaleDateString("en-ZA")}
            </p>

            {status ? (
              <>
                <p className="text-lg font-semibold">
                  <Money cents={status.currentSavedCents} /> saved
                </p>
                <p className="text-xs text-slate-500">
                  Required pace: <Money cents={status.requiredPaceCentsPerWeek} />/week (target
                  remaining ÷ weeks remaining) to reach the target by the deadline.
                </p>
              </>
            ) : (
              <p className="text-sm text-red-700">
                The target date has passed and this goal is not yet met — there is no valid
                weekly pace left to compute. Consider setting a new target date.
              </p>
            )}

            <form action={addContributionAction} className="flex gap-2">
              <input type="hidden" name="goalId" value={goal.id} />
              <input
                className="input flex-1"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Amount (R)"
                required
              />
              <button type="submit" className="btn-secondary">
                Log contribution
              </button>
            </form>
          </div>
        ))}
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-slate-500">No savings goals yet — create one above.</p>
      ) : null}
    </div>
  );
}
