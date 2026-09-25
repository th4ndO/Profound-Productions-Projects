import Skeleton from "@/components/skeletons/Skeleton";
import SellerCardGridSkeleton from "@/components/skeletons/SellerCardGridSkeleton";

export default function CategoryLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <Skeleton className="mb-4 h-7 w-32" />
      <div className="mb-6 flex flex-wrap gap-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <SellerCardGridSkeleton />
    </main>
  );
}
