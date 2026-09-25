import Skeleton from "@/components/skeletons/Skeleton";

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-sm px-4 py-8 pb-16">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="mt-8 h-40 w-full rounded-lg" />
    </main>
  );
}
