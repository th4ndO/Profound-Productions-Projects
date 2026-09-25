import { createClient } from "@/lib/supabase/server";

export type AdminSeller = {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  createdAt: string;
  hasMicrosite: boolean;
};

export type AdminReport = {
  id: string;
  reason: string;
  createdAt: string;
  sellerId: string;
  sellerBusinessName: string;
  sellerSlug: string;
  reporterEmail: string;
};

export type AdminReview = {
  id: string;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  createdAt: string;
  sellerBusinessName: string;
  sellerSlug: string;
  authorName: string;
};

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin";
}

export async function getAllSellersForAdmin(): Promise<AdminSeller[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sellers")
    .select("id, business_name, slug, status, created_at, has_microsite")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map((s) => ({
    id: s.id,
    businessName: s.business_name,
    slug: s.slug,
    status: s.status,
    createdAt: s.created_at,
    hasMicrosite: s.has_microsite,
  }));
}

export async function getOpenReportsForAdmin(): Promise<AdminReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, reason, created_at, seller:sellers(id, business_name, slug), reporter:profiles(email)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    data as unknown as {
      id: string;
      reason: string;
      created_at: string;
      seller: { id: string; business_name: string; slug: string } | null;
      reporter: { email: string | null } | null;
    }[]
  )
    .filter((r) => r.seller !== null)
    .map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.created_at,
      sellerId: r.seller!.id,
      sellerBusinessName: r.seller!.business_name,
      sellerSlug: r.seller!.slug,
      reporterEmail: r.reporter?.email ?? "unknown",
    }));
}

export async function getRecentReviewsForAdmin(limit = 30): Promise<AdminReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, is_hidden, created_at, seller:sellers(business_name, slug), author:profiles(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (
    data as unknown as {
      id: string;
      rating: number;
      comment: string | null;
      is_hidden: boolean;
      created_at: string;
      seller: { business_name: string; slug: string } | null;
      author: { full_name: string | null } | null;
    }[]
  )
    .filter((r) => r.seller !== null)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      isHidden: r.is_hidden,
      createdAt: r.created_at,
      sellerBusinessName: r.seller!.business_name,
      sellerSlug: r.seller!.slug,
      authorName: r.author?.full_name ?? "Student",
    }));
}
