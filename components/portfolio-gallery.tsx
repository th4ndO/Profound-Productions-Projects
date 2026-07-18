"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CATEGORY_LABELS, CATEGORY_OPTIONS, type Project } from "@/lib/types";

export default function PortfolioGallery({
  projects,
  initialCategory = "all",
}: {
  projects: Project[];
  initialCategory?: string;
}) {
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return projects;
    return projects.filter((p) => p.category === activeCategory);
  }, [activeCategory, projects]);

  const categoriesInUse = useMemo(() => {
    const present = new Set(projects.map((p) => p.category));
    return CATEGORY_OPTIONS.filter(([key]) => present.has(key));
  }, [projects]);

  return (
    <div>
      <div className="mb-10 flex items-end justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Featured Projects
        </h2>
      </div>

      <div className="mb-10 flex flex-wrap gap-3">
        <FilterPill
          label="All Work"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
        {categoriesInUse.map(([key, label]) => (
          <FilterPill
            key={key}
            label={label}
            active={activeCategory === key}
            onClick={() => setActiveCategory(key)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="animate-[fade-in_0.4s_ease-out_forwards] rounded-sm border border-dashed border-surface-line py-24 text-center">
          <p className="font-mono text-sm uppercase tracking-wide text-neutral">
            No projects in this category yet
          </p>
        </div>
      ) : (
        <div
          key={activeCategory}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 ${
        active
          ? "border border-accent bg-accent/10 text-accent"
          : "border border-surface-line text-neutral hover:border-paper/30 hover:text-paper hover:-translate-y-0.5"
      } rounded-sm px-4 py-2`}
    >
      {label}
    </button>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article
      className="group relative animate-[fade-in_0.4s_ease-out_forwards] overflow-hidden rounded-sm border border-surface-line bg-surface opacity-0 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_16px_36px_-12px_rgba(222,192,146,0.3)]"
      style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={project.image_url}
          alt={project.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas/95 via-canvas/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-base font-semibold text-paper">
            {project.title}
          </h3>
          <p className="mt-0.5 text-xs text-neutral">
            {CATEGORY_LABELS[project.category]}
          </p>
          <span className="mt-2 block h-px w-8 bg-accent transition-all duration-300 group-hover:w-14" />
        </div>
      </div>
      {project.description && (
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-20 group-hover:opacity-100">
          <p className="px-4 py-3 text-sm text-paper/80">{project.description}</p>
        </div>
      )}
    </article>
  );
}
