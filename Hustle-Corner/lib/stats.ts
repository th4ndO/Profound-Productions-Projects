import { createClient } from "@/lib/supabase/server";

export type SellerStats = {
  views7d: number;
  views30d: number;
  clicks7d: number;
  clicks30d: number;
};

export async function getSellerStats(sellerId: string): Promise<SellerStats> {
  const supabase = await createClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("seller_events")
    .select("event_type, created_at")
    .eq("seller_id", sellerId)
    .gte("created_at", since30);

  const rows = data ?? [];
  const since7 = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const isRecent = (createdAt: string) => new Date(createdAt).getTime() >= since7;

  return {
    views7d: rows.filter((r) => r.event_type === "profile_view" && isRecent(r.created_at)).length,
    views30d: rows.filter((r) => r.event_type === "profile_view").length,
    clicks7d: rows.filter((r) => r.event_type === "whatsapp_click" && isRecent(r.created_at)).length,
    clicks30d: rows.filter((r) => r.event_type === "whatsapp_click").length,
  };
}
