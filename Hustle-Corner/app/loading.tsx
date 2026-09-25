import Skeleton from "@/components/skeletons/Skeleton";
import SellerCardGridSkeleton from "@/components/skeletons/SellerCardGridSkeleton";

export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <section className="py-10 text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto mt-3 h-4 w-64" />
      </section>

      <section className="mb-10">
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </section>

      <section>
        <Skeleton className="mb-3 h-4 w-20" />
        <SellerCardGridSkeleton />
      </section>
    </main>
  );
}
