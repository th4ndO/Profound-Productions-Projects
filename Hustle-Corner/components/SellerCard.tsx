import Image from "next/image";
import Link from "next/link";
import type { SellerCard as SellerCardData } from "@/lib/sellers";
import { getPhotoUrl } from "@/lib/sellers";

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-500">
      <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
    </svg>
  );
}

export default function SellerCard({ seller }: { seller: SellerCardData }) {
  return (
    <Link
      href={`/s/${seller.slug}`}
      className="block overflow-hidden rounded-xl border border-gray-200 transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full bg-gray-100">
        {seller.photoPath ? (
          <Image
            src={getPhotoUrl(seller.photoPath)}
            alt={`${seller.businessName} portfolio photo`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-gray-300">
            {seller.businessName.charAt(0)}
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        {seller.categories[0] && (
          <span className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            {seller.categories[0].name}
          </span>
        )}
        <h3 className="truncate font-semibold">{seller.businessName}</h3>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <StarIcon />
          <span>
            {seller.reviewCount > 0
              ? `${seller.avgRating.toFixed(1)} (${seller.reviewCount})`
              : "No reviews yet"}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900">
          {seller.minPrice != null ? `from R${seller.minPrice}` : "Price on request"}
        </p>
      </div>
    </Link>
  );
}
