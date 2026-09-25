import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSellersByCategory, getActiveCategories, type CategorySort } from "@/lib/sellers";
import SellerCard from "@/components/SellerCard";
import { APP_NAME, CAMPUS_NAME } from "@/config";

const SORT_OPTIONS: { value: CategorySort; label: string }[] = [
  { value: "rating", label: "Top rated" },
  { value: "price", label: "Price: low to high" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const categories = await getActiveCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: `Category not found · ${APP_NAME}` };

  return {
    title: `${category.name} · ${APP_NAME}`,
    description: `${category.name} sellers at ${CAMPUS_NAME} on ${APP_NAME}.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { category: categorySlug } = await params;
  const sp = await searchParams;

  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const minRating = sp.minRating ? Number(sp.minRating) : undefined;
  const sort = (typeof sp.sort === "string" ? sp.sort : "rating") as CategorySort;

  const { category, sellers } = await getSellersByCategory(categorySlug, {
    minPrice,
    maxPrice,
    minRating,
    sort,
  });

  if (!category) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <h1 className="mb-4 text-2xl font-bold">{category.name}</h1>

      <form className="mb-6 flex flex-wrap gap-2 text-sm" action={`/c/${categorySlug}`}>
        <input
          type="number"
          name="minPrice"
          placeholder="Min R"
          defaultValue={sp.minPrice as string}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="number"
          name="maxPrice"
          placeholder="Max R"
          defaultValue={sp.maxPrice as string}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2"
        />
        <select
          name="minRating"
          defaultValue={sp.minRating as string}
          className="rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-lg border border-gray-300 px-3 py-2"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white"
        >
          Apply
        </button>
      </form>

      {sellers.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">
          No {category.name.toLowerCase()} sellers match these filters yet.{" "}
          {minPrice != null || maxPrice != null || minRating != null ? (
            <Link href={`/c/${categorySlug}`} className="font-medium text-brand-600">
              Clear filters
            </Link>
          ) : (
            <Link href="/" className="font-medium text-brand-600">
              Browse other categories
            </Link>
          )}
          .
        </p>
      )}
    </main>
  );
}
