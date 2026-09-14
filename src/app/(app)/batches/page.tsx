import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatRand } from "@/lib/money";

const STATUS_BADGE: Record<string, string> = {
  PLANNED: "bg-stone-100 text-stone-600",
  IN_PRODUCTION: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-amber-100 text-amber-700",
  COSTED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function BatchesPage() {
  const batches = await prisma.batch.findMany({
    include: { recipe: true },
    orderBy: { plannedFor: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Batches</h1>
          <p className="text-sm text-stone-500">Planned production runs and their lifecycle.</p>
        </div>
        <Link href="/batches/new" className="btn-primary">
          Plan a batch
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Recipe</th>
              <th>Target yield</th>
              <th>Planned for</th>
              <th>Status</th>
              <th>Costed unit cost</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td>
                  <Link href={`/batches/${batch.id}`} className="text-brand-700 hover:underline">
                    {batch.recipe.name}
                  </Link>
                </td>
                <td>{batch.targetYield}</td>
                <td>{batch.plannedFor.toISOString().slice(0, 10)}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[batch.status] ?? "bg-stone-100"}`}>
                    {batch.status}
                  </span>
                </td>
                <td>{batch.costedUnitCents !== null ? formatRand(batch.costedUnitCents) : "—"}</td>
              </tr>
            ))}
            {batches.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-stone-400">
                  No batches yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
