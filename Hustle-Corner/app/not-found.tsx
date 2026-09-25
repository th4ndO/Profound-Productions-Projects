import Link from "next/link";
import { APP_NAME } from "@/config";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold text-brand-600">Page not found</h1>
      <p className="mt-2 text-gray-600">
        That page doesn&apos;t exist, or the listing may have been removed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-brand-600 px-6 py-3 font-semibold text-white"
      >
        Back to {APP_NAME}
      </Link>
    </main>
  );
}
