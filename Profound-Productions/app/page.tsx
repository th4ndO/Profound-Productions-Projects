import Link from "next/link";
import SpinningLogo from "@/components/spinning-logo";
import Reveal from "@/components/reveal";

const DISCIPLINES = [
  {
    category: "graphic_design",
    label: "Graphic Design",
    description: "Posters, flyers, and brand identity work.",
    icon: PosterIcon,
  },
  {
    category: "photography",
    label: "Photography",
    description: "Event coverage, products, and portraits.",
    icon: CameraIcon,
  },
  {
    category: "website_work",
    label: "Website Work",
    description: "Design and build for businesses online.",
    icon: BrowserIcon,
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <Disciplines />
    </>
  );
}

function Disciplines() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:px-12 md:py-28">
      <Reveal>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-accent">
          What We Do
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight text-paper md:text-4xl">
          Three disciplines, one studio.
        </h2>
        <span className="mt-5 block h-px w-16 bg-accent" />
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {DISCIPLINES.map((d, i) => {
          const Icon = d.icon;
          return (
            <Reveal key={d.category} delay={i * 100}>
              <Link
                href={`/portfolio?category=${d.category}`}
                className="group relative block overflow-hidden rounded-sm border border-surface-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_12px_30px_-10px_rgba(222,192,146,0.25)]"
              >
                <div className="mb-5 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-surface-line bg-canvas">
                  <Icon className="h-16 w-16 text-accent transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
                </div>
                <h3 className="font-display text-lg font-semibold text-paper">
                  {d.label}
                </h3>
                <p className="mt-2 text-sm text-neutral">{d.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
                  View Work
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function PosterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="14" y="6" width="36" height="52" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M20 18h24M20 26l8 8-8 8M44 26l-8 8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 48h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="18" width="52" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M22 18l4-8h12l4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="37" r="11" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="37" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="49" cy="26" r="2" fill="currentColor" />
    </svg>
  );
}

function BrowserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="12" width="52" height="40" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 22h52" stroke="currentColor" strokeWidth="2" />
      <circle cx="13" cy="17" r="1.6" fill="currentColor" />
      <circle cx="19" cy="17" r="1.6" fill="currentColor" />
      <circle cx="25" cy="17" r="1.6" fill="currentColor" />
      <path d="M16 32h20M16 39h32M16 46h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-surface-line px-6 pt-16 pb-16 md:px-12 md:pt-24 md:pb-20">
      <div className="relative mx-auto grid max-w-6xl items-center gap-4 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
        <div>
          <p className="animate-fade-up mb-4 font-mono text-xs uppercase tracking-[0.25em] text-accent">
            Our Work
          </p>
          <h1 className="animate-fade-up font-display text-4xl font-bold leading-tight text-paper [animation-delay:0.1s] md:text-5xl">
            Transforming Visions
            <br />
            Into Visuals.
          </h1>
          <span className="animate-grow-line-loop mt-5 block h-px w-16 origin-left bg-accent" />
          <p className="animate-fade-up mt-6 max-w-md text-balance text-base text-neutral [animation-delay:0.3s] md:text-lg">
            Explore a selection of recent projects — posters, flyers, and brand
            identity, each one built with purpose, creativity, and attention
            to detail.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="animate-fade-up inline-flex items-center gap-2 rounded-sm border border-accent/60 px-6 py-3 font-mono text-xs uppercase tracking-wider text-paper transition-all duration-200 [animation-delay:0.4s] hover:-translate-y-0.5 hover:border-accent hover:text-accent active:scale-95"
            >
              Start a Project
            </Link>
            <Link
              href="/portfolio"
              className="animate-fade-up inline-flex items-center gap-2 rounded-sm border border-surface-line px-6 py-3 font-mono text-xs uppercase tracking-wider text-neutral transition-all duration-200 [animation-delay:0.45s] hover:-translate-y-0.5 hover:border-paper/40 hover:text-paper active:scale-95"
            >
              View Portfolio
            </Link>
          </div>
        </div>

        <div id="mafela-spot" className="h-16 w-full md:hidden" />

        <SpinningLogo />
      </div>
    </section>
  );
}
