import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-stone-900">Page not found</h1>
      <Link href="/" className="btn-primary inline-flex">
        Back to dashboard
      </Link>
    </div>
  );
}
