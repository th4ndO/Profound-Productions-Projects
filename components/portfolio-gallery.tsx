"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  SUBCATEGORY_OPTIONS,
  type Project,
} from "@/lib/types";

export default function PortfolioGallery({
  projects,
  initialCategory = "all",
}: {
  projects: Project[];
  initialCategory?: string;
}) {
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxOrigin, setLightboxOrigin] = useState<DOMRect | null>(null);

  const filtered = useMemo(() => {
    const byCategory =
      activeCategory === "all"
        ? projects
        : projects.filter((p) => p.category === activeCategory);
    if (activeCategory !== "graphic_design" || activeSubcategory === "all") {
      return byCategory;
    }
    return byCategory.filter((p) => p.subcategory === activeSubcategory);
  }, [activeCategory, activeSubcategory, projects]);

  const categoriesInUse = useMemo(() => {
    const present = new Set(projects.map((p) => p.category));
    return CATEGORY_OPTIONS.filter(([key]) => present.has(key));
  }, [projects]);

  const subcategoriesInUse = useMemo(() => {
    const present = new Set(
      projects
        .filter((p) => p.category === "graphic_design")
        .map((p) => p.subcategory)
    );
    return SUBCATEGORY_OPTIONS.filter(([key]) => present.has(key));
  }, [projects]);

  function selectCategory(key: string) {
    setActiveCategory(key);
    setActiveSubcategory("all");
  }

  return (
    <div>
      <div className="mb-10 flex items-end justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Featured Projects
        </h2>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <FilterPill
          label="All Work"
          active={activeCategory === "all"}
          onClick={() => selectCategory("all")}
        />
        {categoriesInUse.map(([key, label]) => (
          <FilterPill
            key={key}
            label={label}
            active={activeCategory === key}
            onClick={() => selectCategory(key)}
          />
        ))}
      </div>

      {activeCategory === "graphic_design" && subcategoriesInUse.length > 1 && (
        <div className="mb-10 flex flex-wrap gap-2">
          <FilterPill
            label="All Types"
            active={activeSubcategory === "all"}
            onClick={() => setActiveSubcategory("all")}
          />
          {subcategoriesInUse.map(([key, label]) => (
            <FilterPill
              key={key}
              label={label}
              active={activeSubcategory === key}
              onClick={() => setActiveSubcategory(key)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="animate-[fade-in_0.4s_ease-out_forwards] rounded-sm border border-dashed border-surface-line py-24 text-center">
          <p className="font-mono text-sm uppercase tracking-wide text-neutral">
            No projects in this category yet
          </p>
        </div>
      ) : (
        <div
          key={`${activeCategory}-${activeSubcategory}`}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              onOpen={(rect) => {
                setLightboxOrigin(rect);
                setLightboxIndex(i);
              }}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          project={filtered[lightboxIndex]}
          origin={lightboxOrigin}
          onClose={() => setLightboxIndex(null)}
          onPrev={
            filtered.length > 1
              ? () => setLightboxIndex((i) => (i! - 1 + filtered.length) % filtered.length)
              : undefined
          }
          onNext={
            filtered.length > 1
              ? () => setLightboxIndex((i) => (i! + 1) % filtered.length)
              : undefined
          }
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
  const [loaded, setLoaded] = useState(false);

  // Belt-and-suspenders: onLoad can be missed for images that finish
  // loading before React attaches the listener (fast cache hits), so
  // never leave the image permanently invisible if that happens.
  useEffect(() => {
    const timer = window.setTimeout(() => setLoaded(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

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
        className={`relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden text-left ${
          loaded ? "" : "animate-pulse bg-surface"
        }`}
      >
        <Image
          src={project.image_url}
          alt={project.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          ref={(img) => {
            if (img?.complete) setLoaded(true);
          }}
          onLoad={() => setLoaded(true)}
          className={`object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.04] ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
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
  onPrev,
  onNext,
}: {
  project: Project;
  origin: DOMRect | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
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
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleClose, onPrev, onNext]);

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
        @keyframes lightbox-image-fade {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-sm border border-surface-line text-neutral transition-colors hover:border-accent hover:text-accent"
      >
        <CloseIcon />
      </button>

      {onPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous image"
          className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-sm border border-surface-line text-neutral transition-colors hover:border-accent hover:text-accent sm:left-4"
        >
          <ChevronIcon direction="left" />
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next image"
          className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-sm border border-surface-line text-neutral transition-colors hover:border-accent hover:text-accent sm:right-4"
        >
          <ChevronIcon direction="right" />
        </button>
      )}

      <div
        ref={imageBoxRef}
        className="relative h-[65vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          key={project.id}
          className="absolute inset-0 animate-[lightbox-image-fade_0.3s_ease-out]"
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
      </div>

      <div
        key={`caption-${project.id}`}
        className={`max-w-xl text-center ${
          closing ? "opacity-0 transition-opacity duration-150" : "animate-[lightbox-caption_0.35s_ease-out_0.1s_both]"
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
        {project.website_url && (
          <a
            href={project.website_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-4 inline-flex items-center gap-2 rounded-sm border border-accent/60 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent transition-colors hover:border-accent hover:bg-accent/10"
          >
            Visit Website
            <ExternalLinkIcon />
          </a>
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

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M7 17L17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
