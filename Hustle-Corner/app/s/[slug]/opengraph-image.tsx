import { ImageResponse } from "next/og";
import { getSellerBySlug } from "@/lib/sellers";
import { APP_NAME } from "@/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const seller = await getSellerBySlug(slug);

  const category = seller?.categories[0]?.name;
  const priceLabel = seller?.minPrice != null ? `from R${seller.minPrice}` : null;
  const ratingLabel =
    seller && seller.reviewCount > 0 ? `★ ${seller.avgRating.toFixed(1)} (${seller.reviewCount})` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#14283e",
          color: "#ffffff",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, opacity: 0.85 }}>
          {APP_NAME}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {category && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                backgroundColor: "#eef2f7",
                color: "#14283e",
                borderRadius: 999,
                padding: "8px 20px",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {category}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>
            {seller?.businessName ?? "Seller not found"}
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 32, opacity: 0.9 }}>
            {ratingLabel && <div style={{ display: "flex" }}>{ratingLabel}</div>}
            {priceLabel && <div style={{ display: "flex" }}>{priceLabel}</div>}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
