import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
      <h1 className="text-lg font-semibold text-stone-900">Not found</h1>
      <p className="text-sm text-stone-500">
        That record doesn&apos;t exist, or may have been removed.
      </p>
      <Link href="/" className="btn-primary inline-flex">
        Back to dashboard
      </Link>
    </div>
  );
}
