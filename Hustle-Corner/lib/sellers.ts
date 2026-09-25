import { createClient } from "@/lib/supabase/server";

export type CategoryTag = { name: string; slug: string };

export type SellerCard = {
  id: string;
  slug: string;
  businessName: string;
  bio: string | null;
  areaNote: string | null;
  avgRating: number;
  reviewCount: number;
  minPrice: number | null;
  categories: CategoryTag[];
  photoPath: string | null;
};

export type SellerDetail = SellerCard & {
  status: string;
  ownerId: string;
  whatsappNumber: string;
  instagramHandle: string | null;
  hasMicrosite: boolean;
  micrositeTagline: string | null;
  micrositeThemeColor: string | null;
  micrositeStory: string | null;
  services: { id: string; name: string; priceFrom: number; priceTo: number | null; durationMinutes: number | null }[];
  photos: { id: string; storagePath: string }[];
  reviews: { id: string; rating: number; comment: string | null; createdAt: string; authorName: string }[];
};

const SELLER_CARD_SELECT = `
  id, slug, business_name, bio, area_note, avg_rating, review_count,
  services(id, name, price_from, price_to, duration_minutes, is_active),
  seller_categories(categories(name, slug)),
  seller_photos(id, storage_path, sort_order)
`;

type SellerRow = {
  id: string;
  slug: string;
  business_name: string;
  bio: string | null;
  area_note: string | null;
  avg_rating: number;
  review_count: number;
  services:
    | { id: string; name: string; price_from: number; price_to: number | null; duration_minutes: number | null; is_active: boolean }[]
    | null;
  seller_categories: { categories: CategoryTag | null }[] | null;
  seller_photos: { id: string; storage_path: string; sort_order: number }[] | null;
};

function mapSellerCard(row: SellerRow): SellerCard {
  const activePrices = (row.services ?? [])
    .filter((s) => s.is_active)
    .map((s) => s.price_from);
  const photos = [...(row.seller_photos ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return {
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    bio: row.bio,
    areaNote: row.area_note,
    avgRating: Number(row.avg_rating),
    reviewCount: row.review_count,
    minPrice: activePrices.length ? Math.min(...activePrices) : null,
    categories: (row.seller_categories ?? [])
      .map((sc) => sc.categories)
      .filter((c): c is CategoryTag => c !== null),
    photoPath: photos[0]?.storage_path ?? null,
  };
}

export async function getActiveCategories(): Promise<CategoryTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("name, slug")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getTopRatedSellers(limit = 6): Promise<SellerCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sellers")
    .select(SELLER_CARD_SELECT)
    .eq("status", "approved")
    .order("avg_rating", { ascending: false })
    .order("review_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as SellerRow[]).map(mapSellerCard);
}

export type CategorySort = "rating" | "price" | "newest";

export async function getSellersByCategory(
  categorySlug: string,
  opts: { minPrice?: number; maxPrice?: number; minRating?: number; sort?: CategorySort } = {},
): Promise<{ category: CategoryTag | null; sellers: SellerCard[] }> {
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("name, slug")
    .eq("slug", categorySlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!category) return { category: null, sellers: [] };

  const { data: links, error: linksError } = await supabase
    .from("seller_categories")
    .select("seller_id, categories!inner(slug)")
    .eq("categories.slug", categorySlug);
  if (linksError) throw linksError;

  const sellerIds = (links ?? []).map((l) => l.seller_id);
  if (!sellerIds.length) return { category, sellers: [] };

  const { data, error } = await supabase
    .from("sellers")
    .select(SELLER_CARD_SELECT)
    .eq("status", "approved")
    .in("id", sellerIds);
  if (error) throw error;

  let sellers = (data as unknown as SellerRow[]).map(mapSellerCard);

  if (opts.minRating) {
    sellers = sellers.filter((s) => s.avgRating >= opts.minRating!);
  }
  if (opts.minPrice != null) {
    sellers = sellers.filter((s) => s.minPrice != null && s.minPrice >= opts.minPrice!);
  }
  if (opts.maxPrice != null) {
    sellers = sellers.filter((s) => s.minPrice != null && s.minPrice <= opts.maxPrice!);
  }

  if (opts.sort === "price") {
    sellers.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
  } else {
    // "rating" (default) and "newest" both fall back to the query's own
    // ordering (rating desc) since sellers already came back sorted that
    // way and we don't yet expose created_at on the card.
    sellers.sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);
  }

  return { category, sellers };
}

export async function searchSellers(query: string): Promise<SellerCard[]> {
  const supabase = await createClient();
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("sellers")
    .select(SELLER_CARD_SELECT)
    .eq("status", "approved")
    .or(`business_name.ilike.%${q}%,bio.ilike.%${q}%`);
  if (error) throw error;

  const nameMatches = (data as unknown as SellerRow[]).map(mapSellerCard);

  const { data: serviceMatches } = await supabase
    .from("services")
    .select(`seller:sellers!inner(${SELLER_CARD_SELECT})`)
    .ilike("name", `%${q}%`)
    .eq("seller.status", "approved");

  const bySlug = new Map(nameMatches.map((s) => [s.slug, s]));
  for (const row of (serviceMatches ?? []) as unknown as { seller: SellerRow }[]) {
    const card = mapSellerCard(row.seller);
    if (!bySlug.has(card.slug)) bySlug.set(card.slug, card);
  }

  return Array.from(bySlug.values());
}

type SellerDetailRow = SellerRow & {
  status: string;
  owner_id: string;
  whatsapp_number: string;
  instagram_handle: string | null;
  has_microsite: boolean;
  microsite_tagline: string | null;
  microsite_theme_color: string | null;
  microsite_story: string | null;
  reviews:
    | { id: string; rating: number; comment: string | null; created_at: string; is_hidden: boolean; author_id: string }[]
    | null;
};

const SELLER_DETAIL_SELECT = `${SELLER_CARD_SELECT}, status, owner_id, whatsapp_number, instagram_handle,
   has_microsite, microsite_tagline, microsite_theme_color, microsite_story,
   reviews(id, rating, comment, created_at, is_hidden, author_id)`;

export async function getSellerBySlug(slug: string): Promise<SellerDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sellers")
    .select(SELLER_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return mapSellerDetail(await createClient(), data as unknown as SellerDetailRow);
}

/** The logged-in user's own seller row, regardless of approval status. RLS
 * already restricts this to the caller's own row (or an admin). */
export async function getSellerByOwner(ownerId: string): Promise<SellerDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sellers")
    .select(SELLER_DETAIL_SELECT)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return mapSellerDetail(supabase, data as unknown as SellerDetailRow);
}

async function mapSellerDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: SellerDetailRow,
): Promise<SellerDetail> {
  const visibleReviews = (row.reviews ?? []).filter((r) => !r.is_hidden);
  const authorIds = visibleReviews.map((r) => r.author_id);
  const authorNames = new Map<string, string>();
  if (authorIds.length) {
    const { data: authors } = await supabase.rpc("get_review_author_names", {
      profile_ids: authorIds,
    });
    for (const a of authors ?? []) authorNames.set(a.id, a.full_name ?? "Student");
  }

  const card = mapSellerCard(row);
  const photos = [...(row.seller_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const activeServices = (row.services ?? []).filter((s) => s.is_active);

  return {
    ...card,
    status: row.status,
    ownerId: row.owner_id,
    whatsappNumber: row.whatsapp_number,
    instagramHandle: row.instagram_handle,
    hasMicrosite: row.has_microsite,
    micrositeTagline: row.microsite_tagline,
    micrositeThemeColor: row.microsite_theme_color,
    micrositeStory: row.microsite_story,
    services: activeServices.map((s) => ({
      id: s.id,
      name: s.name,
      priceFrom: s.price_from,
      priceTo: s.price_to,
      durationMinutes: s.duration_minutes,
    })),
    photos: photos.map((p) => ({ id: p.id, storagePath: p.storage_path })),
    reviews: visibleReviews
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        authorName: authorNames.get(r.author_id) ?? "Student",
      })),
  };
}

export function getPhotoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/seller-photos/${storagePath}`;
}
