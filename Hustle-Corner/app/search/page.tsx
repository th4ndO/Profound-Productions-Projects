import Link from "next/link";
import { searchSellers } from "@/lib/sellers";
import SellerCard from "@/components/SellerCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const sellers = q ? await searchSellers(q) : [];

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <h1 className="mb-4 text-2xl font-bold">
        {q ? `Results for "${q}"` : "Search"}
      </h1>

      {!q && <p className="text-gray-500">Type something in the search bar above.</p>}

      {q && sellers.length === 0 && (
        <p className="text-gray-500">
          No sellers found for &quot;{q}&quot;. Try a different search, or{" "}
          <Link href="/" className="font-medium text-brand-600">
            browse all categories
          </Link>
          .
        </p>
      )}

      {sellers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </main>
  );
}
