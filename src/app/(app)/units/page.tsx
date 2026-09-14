import { prisma } from "@/lib/db";
import { NewConversionForm, NewUnitForm } from "./unit-forms";

export default async function UnitsPage() {
  const [units, conversions] = await Promise.all([
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
    prisma.unitConversion.findMany({
      include: { fromUnit: true, toUnit: true },
      orderBy: { id: "asc" },
    }),
  ]);
  const unitById = new Map(units.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Units</h1>
        <p className="text-sm text-stone-500">
          Measurement units and the conversions between them. Every recipe
          quantity and ingredient purchase/recipe unit refers back to one of
          these.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Name</th>
                <th>Symbol</th>
                <th>Measure type</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="font-mono">{u.symbol}</td>
                  <td>{u.measureType}</td>
                </tr>
              ))}
              {units.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-stone-400">
                    No units yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Factor</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((c) => (
                <tr key={c.id}>
                  <td>{unitById.get(c.fromUnitId)?.symbol ?? c.fromUnitId}</td>
                  <td>{unitById.get(c.toUnitId)?.symbol ?? c.toUnitId}</td>
                  <td>{c.factor}</td>
                </tr>
              ))}
              {conversions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-stone-400">
                    No conversions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NewUnitForm />
        <NewConversionForm units={units} />
      </div>
    </div>
  );
}
