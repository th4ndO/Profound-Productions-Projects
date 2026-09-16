import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/categories", label: "Categories" },
  { href: "/periods", label: "Periods" },
  { href: "/savings", label: "Savings" },
];

export function NavBar({ email }: { email: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <span className="mr-2 text-sm font-semibold text-brand-700">Student Budget Planner</span>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-1 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logoutAction} className="flex items-center gap-2 text-sm text-slate-500">
          <span className="hidden sm:inline">{email}</span>
          <button type="submit" className="btn-secondary py-1">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
