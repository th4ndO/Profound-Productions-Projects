import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/contact-form";
import Reveal from "@/components/reveal";
import { getPublishedProjects } from "@/lib/get-published-projects";
import { CATEGORY_LABELS } from "@/lib/types";

export default async function ContactPage() {
  const { projects: allProjects } = await getPublishedProjects();
  const projects = allProjects.slice(0, 3);

  return (
    <section className="mx-auto max-w-xl px-6 py-20 md:py-28">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-accent">
        Get in touch
      </p>
      <h1 className="font-display text-4xl font-bold leading-tight text-paper md:text-5xl">
        Let&apos;s get it on paper.
      </h1>
      <span className="mt-5 block h-px w-16 bg-accent" />
      <p className="mt-6 text-neutral">
        Tell me what you need — I&apos;ll reply on WhatsApp, usually the same day.
      </p>
      <div className="mt-10">
        <ContactForm />
      </div>

      {projects && projects.length > 0 && (
        <Reveal className="mt-20 border-t border-surface-line pt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Some of Our Work
            </h2>
            <Link
              href="/portfolio"
              className="font-mono text-xs uppercase tracking-wide text-neutral transition-colors hover:text-paper"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {projects.map((project, i) => (
              <Reveal key={project.id} delay={i * 80}>
                <div className="group relative aspect-[4/3] overflow-hidden rounded-sm border border-surface-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_14px_30px_-12px_rgba(222,192,146,0.3)]">
                  <Image
                    src={project.image_url}
                    alt={project.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-canvas/90 via-canvas/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="font-display text-sm font-semibold text-paper">
                      {project.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral">
                      {CATEGORY_LABELS[project.category]}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      )}
    </section>
  );
}
