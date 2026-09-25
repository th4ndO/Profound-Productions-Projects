import Skeleton from "@/components/skeletons/Skeleton";

export default function SellerLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Skeleton className="aspect-square rounded-lg" />
        <Skeleton className="aspect-square rounded-lg" />
        <Skeleton className="aspect-square rounded-lg" />
      </div>

      <Skeleton className="mb-2 h-5 w-20 rounded-full" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <Skeleton className="mt-4 h-16 w-full" />
      <Skeleton className="mt-6 h-12 w-full rounded-full" />

      <div className="mt-8">
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </main>
  );
}
