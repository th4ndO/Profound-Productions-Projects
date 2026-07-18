import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import AmbientEffects from "@/components/ambient-effects";
import Reveal from "@/components/reveal";
import WhatsAppButton from "@/components/whatsapp-button";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Profound Productions",
  description:
    "Posters, branding, and print-ready design for local businesses, food brands, events, and artists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-canvas text-paper font-body antialiased">
        <AmbientGlow />
        <AmbientEffects />
        <SiteHeader />
        <main className="relative">{children}</main>
        <SiteFooter />
        <WhatsAppButton />
        <Analytics />
      </body>
    </html>
  );
}

function AmbientGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <span className="animate-drift-1 absolute h-[max(220px,28vw)] w-[max(220px,28vw)] rounded-full bg-[radial-gradient(circle,_var(--accent)_0%,_transparent_70%)] opacity-20 blur-3xl" />
      <span className="animate-drift-2 absolute h-[max(180px,22vw)] w-[max(180px,22vw)] rounded-full bg-[radial-gradient(circle,_var(--accent-strong)_0%,_transparent_70%)] opacity-15 blur-3xl" />
      <span className="animate-drift-3 absolute h-[max(260px,34vw)] w-[max(260px,34vw)] rounded-full bg-[radial-gradient(circle,_var(--accent)_0%,_transparent_70%)] opacity-10 blur-3xl" />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-surface-line px-6 py-14 md:px-12">
      <Reveal className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/brand/logo-v2.png"
              alt="Profound Productions"
              width={56}
              height={56}
              className="h-14 w-14"
            />
            <span className="font-display text-sm font-bold uppercase tracking-wide text-paper">
              Profound
              <br />
              Productions
            </span>
          </div>
          <p className="max-w-xs text-sm text-neutral">
            We design with purpose — posters, brand identity, and print-ready
            work that helps businesses look the part.
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-mono text-xs uppercase tracking-wider text-accent">
            Quick Links
          </h3>
          <ul className="space-y-2 text-sm text-neutral">
            <li><Link href="/portfolio" className="transition-colors hover:text-paper">Portfolio</Link></li>
            <li><Link href="/contact" className="transition-colors hover:text-paper">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-mono text-xs uppercase tracking-wider text-accent">
            Contact
          </h3>
          <ul className="space-y-2 text-sm text-neutral">
            <li>
              <a href="tel:+27764469804" className="transition-colors hover:text-paper">
                076 446 9804
              </a>
            </li>
            <li>
              <a href="mailto:profoundproductionss@gmail.com" className="transition-colors hover:text-paper">
                profoundproductionss@gmail.com
              </a>
            </li>
            <li>Replies on WhatsApp, same day</li>
          </ul>
        </div>
      </Reveal>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-surface-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs text-neutral">
          © {new Date().getFullYear()} Profound Productions. All rights reserved.
        </p>
        <p className="font-mono text-xs text-neutral">
          Website made by Profound Productions
        </p>
      </div>
    </footer>
  );
}
