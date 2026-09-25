"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-surface-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-12">
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/brand/logo-v2.png"
            alt="Profound Productions"
            width={56}
            height={56}
            className="h-12 w-12 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 md:h-14 md:w-14"
            priority
          />
          <span className="hidden font-display text-xs font-bold uppercase leading-tight tracking-wide text-paper sm:block">
            Profound
            <br />
            Productions
          </span>
        </Link>

        <nav className="flex items-center gap-4 font-mono text-sm uppercase tracking-wide sm:gap-6">
          {LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative pb-1 transition-colors ${
                  isActive ? "text-accent" : "text-paper/80 hover:text-paper"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-[1px] left-0 h-[2px] w-full bg-accent" />
                )}
              </Link>
            );
          })}
          <Link
            href="/contact"
            className="hidden rounded-sm border border-accent/60 bg-accent px-4 py-2 text-xs text-canvas transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-[0_8px_20px_-6px_rgba(222,192,146,0.5)] active:scale-95 md:block"
          >
            Let&apos;s Work Together
          </Link>
        </nav>
      </div>
    </header>
  );
}
