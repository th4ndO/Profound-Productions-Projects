import Skeleton from "@/components/skeletons/Skeleton";

export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-16">
      <Skeleton className="mb-8 h-8 w-24" />
      <Skeleton className="mb-3 h-4 w-20" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </main>
  );
}
