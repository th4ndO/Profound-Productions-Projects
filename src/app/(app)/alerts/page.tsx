import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPercent } from "@/lib/money";
import { acknowledgeAlertAction } from "./actions";

export default async function AlertsPage() {
  const [alerts, user] = await Promise.all([
    prisma.marginAlert.findMany({
      include: { product: { include: { recipe: true } } },
      orderBy: { triggeredAt: "desc" },
    }),
    getCurrentUser(),
  ]);
  const canAcknowledge = user?.role === "ADMIN" || user?.role === "BUYER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Margin alerts</h1>
        <p className="text-sm text-stone-500">
          Written automatically whenever a new ingredient price causes an
          active product's margin to cross below its minimum threshold (see
          Phase 7 / recordIngredientPrice).
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Product</th>
              <th>Triggered</th>
              <th>Old margin</th>
              <th>New margin</th>
              <th>Acknowledged</th>
              {canAcknowledge ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>{alert.product.recipe.name}</td>
                <td>{alert.triggeredAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td>{formatPercent(alert.oldMargin)}</td>
                <td className="font-medium text-red-600">{formatPercent(alert.newMargin)}</td>
                <td>{alert.acknowledged ? "Yes" : "No"}</td>
                {canAcknowledge ? (
                  <td>
                    {!alert.acknowledged ? (
                      <form action={acknowledgeAlertAction.bind(null, alert.id)}>
                        <button type="submit" className="btn-secondary">
                          Acknowledge
                        </button>
                      </form>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={canAcknowledge ? 6 : 5} className="py-6 text-center text-stone-400">
                  No margin alerts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
