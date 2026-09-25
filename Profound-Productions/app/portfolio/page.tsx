import type { Metadata } from "next";
import { getPublishedProjects } from "@/lib/get-published-projects";
import PortfolioGallery from "@/components/portfolio-gallery";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Browse graphic design, photography, and website work from Profound Productions — posters, flyers, brand identity, and more.",
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const { projects, error } = await getPublishedProjects();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:px-12 md:py-28">
      <p className="animate-fade-up mb-3 font-mono text-xs uppercase tracking-[0.25em] text-accent">
        Our Work
      </p>
      <h1 className="animate-fade-up font-display text-4xl font-bold leading-tight text-paper [animation-delay:0.08s] md:text-5xl">
        Portfolio
      </h1>
      <span className="animate-grow-line-loop mt-5 block h-px w-16 origin-left bg-accent" />
      <p className="animate-fade-up mt-6 max-w-md text-balance text-base text-neutral [animation-delay:0.2s] md:text-lg">
        Graphic design, photography, and website work — browse by category
        below.
      </p>

      <div className="mt-12">
        {error ? (
          <p className="font-mono text-sm text-accent">
            Couldn&apos;t load the portfolio right now. Check back shortly.
          </p>
        ) : (
          <PortfolioGallery
            projects={projects}
            initialCategory={category ?? "all"}
          />
        )}
      </div>
    </section>
  );
}
