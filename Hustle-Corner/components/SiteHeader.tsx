import Link from "next/link";
import { APP_NAME } from "@/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    isAdmin = data?.role === "admin";
  }

  return (
    <header className="sticky top-0 z-10 border-b border-brand-700 bg-brand-600">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
        <Link
          href="/"
          className="flex shrink-0 items-center py-2 text-lg font-bold text-white focus-visible:outline-white"
        >
          {APP_NAME}
        </Link>
        <form action="/search" method="get" className="flex flex-1 items-center">
          <input
            type="search"
            name="q"
            placeholder="Search sellers or services"
            className="h-10 w-full rounded-full border border-brand-500 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-white focus-visible:outline-brand-500"
          />
        </form>
        {user && (
          <Link
            href="/bookings"
            className="flex shrink-0 items-center py-2 text-sm font-medium text-white/90 focus-visible:outline-white"
          >
            Bookings
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex shrink-0 items-center py-2 text-sm font-medium text-white/90 focus-visible:outline-white"
          >
            Admin
          </Link>
        )}
        {user ? (
          <form action={signOut} className="shrink-0">
            <button
              type="submit"
              className="flex items-center py-2 text-sm text-white/80 hover:text-white focus-visible:outline-white"
            >
              Log out
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="flex shrink-0 items-center py-2 text-sm font-medium text-white focus-visible:outline-white"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
