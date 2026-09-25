import Link from "next/link";
import { APP_NAME, CAMPUS_NAME } from "@/config";
import { getActiveCategories, getTopRatedSellers } from "@/lib/sellers";
import SellerCard from "@/components/SellerCard";

export default async function HomePage() {
  const [categories, topSellers] = await Promise.all([
    getActiveCategories(),
    getTopRatedSellers(6),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <section className="py-10 text-center">
        <h1 className="text-3xl font-bold text-brand-600">
          Find student hustles near campus
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-gray-600">
          Real students at {CAMPUS_NAME} offering real services — message
          them directly on WhatsApp, no app, no middleman.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          How it works
        </h2>
        <div className="space-y-3">
          {[
            {
              title: "Find a seller",
              body: "Browse by category or search for what you need.",
            },
            {
              title: "Message on WhatsApp",
              body: "Chat directly with them — no booking or payment through the site.",
            },
            {
              title: "Get it done",
              body: "Meet up, get your service, then leave a review to help other students.",
            },
          ].map((step, i) => (
            <div key={step.title} className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-gray-500">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Categories
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/c/${category.slug}`}
                className="rounded-xl border border-gray-200 px-4 py-6 text-center font-medium transition hover:border-brand-500 hover:text-brand-600"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Top rated
        </h2>
        {topSellers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {topSellers.map((seller) => (
              <SellerCard key={seller.id} seller={seller} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            No sellers yet — check back soon, or be the first to list your
            services.
          </p>
        )}
      </section>
    </main>
  );
}
