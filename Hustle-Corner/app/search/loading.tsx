import Skeleton from "@/components/skeletons/Skeleton";
import SellerCardGridSkeleton from "@/components/skeletons/SellerCardGridSkeleton";

export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <Skeleton className="mb-4 h-7 w-40" />
      <SellerCardGridSkeleton />
    </main>
  );
}
