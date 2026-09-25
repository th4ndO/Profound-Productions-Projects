import Link from "next/link";
import { redirect } from "next/navigation";
import {
  isCurrentUserAdmin,
  getAllSellersForAdmin,
  getOpenReportsForAdmin,
  getRecentReviewsForAdmin,
} from "@/lib/admin";
import SellerStatusButtons from "@/components/admin/SellerStatusButtons";
import SellerMicrositeToggle from "@/components/admin/SellerMicrositeToggle";
import ResolveReportButton from "@/components/admin/ResolveReportButton";
import ReviewModerationButtons from "@/components/admin/ReviewModerationButtons";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  hidden: "bg-red-100 text-red-700",
};

export default async function AdminPage() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const [sellers, reports, reviews] = await Promise.all([
    getAllSellersForAdmin(),
    getOpenReportsForAdmin(),
    getRecentReviewsForAdmin(),
  ]);

  const pendingCount = sellers.filter((s) => s.status === "pending").length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <h1 className="mb-8 text-2xl font-bold">Admin</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Sellers {pendingCount > 0 && `(${pendingCount} pending)`}
        </h2>
        <ul className="space-y-2">
          {sellers.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div>
                <Link href={`/s/${s.slug}`} className="font-medium hover:underline">
                  {s.businessName}
                </Link>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status] ?? ""}`}
                >
                  {s.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SellerMicrositeToggle sellerId={s.id} hasMicrosite={s.hasMicrosite} />
                <SellerStatusButtons sellerId={s.id} status={s.status} />
              </div>
            </li>
          ))}
          {sellers.length === 0 && <p className="text-gray-500">No sellers yet.</p>}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Open reports
        </h2>
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/s/${r.sellerSlug}`} className="font-medium hover:underline">
                    {r.sellerBusinessName}
                  </Link>
                  <p className="text-sm text-gray-500">reported by {r.reporterEmail}</p>
                  <p className="mt-1 text-sm text-gray-700">{r.reason}</p>
                </div>
                <ResolveReportButton reportId={r.id} />
              </div>
            </li>
          ))}
          {reports.length === 0 && <p className="text-gray-500">No open reports.</p>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Recent reviews
        </h2>
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/s/${r.sellerSlug}`} className="font-medium hover:underline">
                    {r.sellerBusinessName}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {r.rating}/5 · {r.authorName}
                    {r.isHidden && <span className="ml-1 text-red-600">(hidden)</span>}
                  </p>
                  {r.comment && <p className="mt-1 text-sm text-gray-700">{r.comment}</p>}
                </div>
                <ReviewModerationButtons reviewId={r.id} isHidden={r.isHidden} />
              </div>
            </li>
          ))}
          {reviews.length === 0 && <p className="text-gray-500">No reviews yet.</p>}
        </ul>
      </section>
    </main>
  );
}
