"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [lightboxProject, setLightboxProject] = useState<Project | null>(null);
  const [lightboxOrigin, setLightboxOrigin] = useState<DOMRect | null>(null);

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
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              onOpen={(rect) => {
                setLightboxOrigin(rect);
                setLightboxProject(project);
              }}
            />
          ))}
        </div>
      )}

      {lightboxProject && (
        <Lightbox
          project={lightboxProject}
          origin={lightboxOrigin}
          onClose={() => setLightboxProject(null)}
        />
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

function ProjectCard({
  project,
  index,
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: (rect: DOMRect) => void;
}) {
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
      <button
        type="button"
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
        aria-label={`View full image: ${project.title}`}
        className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden text-left"
      >
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
      </button>
      {project.description && (
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-20 group-hover:opacity-100">
          <p className="px-4 py-3 text-sm text-paper/80">{project.description}</p>
        </div>
      )}
    </article>
  );
}

function Lightbox({
  project,
  origin,
  onClose,
}: {
  project: Project;
  origin: DOMRect | null;
  onClose: () => void;
}) {
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleClose]);

  // Zoom the image in from the exact spot it was clicked (FLIP technique):
  // snap the box to the thumbnail's old position/size, then transition it
  // back to its natural (centered) layout on the next frame.
  useEffect(() => {
    const node = imageBoxRef.current;
    if (!node) return;

    if (origin) {
      const final = node.getBoundingClientRect();
      const dx = origin.left + origin.width / 2 - (final.left + final.width / 2);
      const dy = origin.top + origin.height / 2 - (final.top + final.height / 2);
      const sx = origin.width / final.width;
      const sy = origin.height / final.height;
      node.style.transition = "none";
      node.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      node.style.opacity = "0.6";
    } else {
      node.style.transition = "none";
      node.style.transform = "scale(0.92)";
      node.style.opacity = "0";
    }

    void node.getBoundingClientRect(); // force reflow so the snap above isn't animated

    requestAnimationFrame(() => {
      node.style.transition =
        "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-out";
      node.style.transform = "translate(0px, 0px) scale(1, 1)";
      node.style.opacity = "1";
    });
  }, [origin]);

  useEffect(() => {
    if (!closing) return;
    const node = imageBoxRef.current;
    if (!node) return;
    node.style.transition = "transform 0.2s ease-in, opacity 0.2s ease-in";
    node.style.transform = "scale(0.94)";
    node.style.opacity = "0";
  }, [closing]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-canvas/95 p-4 backdrop-blur-sm transition-opacity duration-200 sm:p-8 ${
        closing ? "opacity-0" : "animate-[lightbox-fade_0.25s_ease-out]"
      }`}
    >
      <style>{`
        @keyframes lightbox-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lightbox-caption {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-sm border border-surface-line text-neutral transition-colors hover:border-accent hover:text-accent"
      >
        <CloseIcon />
      </button>

      <div
        ref={imageBoxRef}
        className="relative h-[65vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={project.image_url}
          alt={project.title}
          fill
          sizes="90vw"
          className="object-contain"
          priority
        />
      </div>

      <div
        className={`max-w-xl text-center ${
          closing ? "opacity-0 transition-opacity duration-150" : "animate-[lightbox-caption_0.35s_ease-out_0.15s_both]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-paper">{project.title}</h3>
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-neutral">
          {CATEGORY_LABELS[project.category]}
          {project.client_name ? ` — ${project.client_name}` : ""}
        </p>
        {project.description && (
          <p className="mt-2 text-sm text-paper/80">{project.description}</p>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
