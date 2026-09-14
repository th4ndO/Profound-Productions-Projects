import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./actions";

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Dashboard" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/units", label: "Units" },
  { href: "/recipes", label: "Recipes" },
  { href: "/products", label: "Products" },
  { href: "/batches", label: "Batches" },
  { href: "/alerts", label: "Alerts" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Defence in depth: middleware already gates unauthenticated access, but
  // a server component that reads `user` below should never render with a
  // null user, so this layout checks again rather than trusting the caller.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-brand-700">Costing Planner</span>
            <nav className="flex flex-wrap gap-3 text-sm">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded px-2 py-1 text-stone-600 hover:bg-brand-50 hover:text-brand-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
            <span className="max-w-[14rem] truncate sm:max-w-none">{user.email}</span>
            <span className="badge bg-stone-100 text-stone-600">{user.role}</span>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
