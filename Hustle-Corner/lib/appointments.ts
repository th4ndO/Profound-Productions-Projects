import { createClient } from "@/lib/supabase/server";

export type AppointmentStatus = "pending" | "confirmed" | "declined" | "cancelled";

export type SellerAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  note: string | null;
  buyerName: string;
  serviceName: string | null;
};

export type BuyerAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  note: string | null;
  sellerBusinessName: string;
  sellerSlug: string;
  serviceName: string | null;
};

export async function getSellerAppointments(sellerId: string): Promise<SellerAppointment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, buyer_id, start_at, end_at, status, note, service:services(name)")
    .eq("seller_id", sellerId)
    .order("start_at");
  if (error) throw error;

  const rows = data as unknown as {
    id: string;
    buyer_id: string;
    start_at: string;
    end_at: string;
    status: AppointmentStatus;
    note: string | null;
    service: { name: string } | null;
  }[];

  const buyerIds = rows.map((r) => r.buyer_id);
  const names = new Map<string, string>();
  if (buyerIds.length) {
    const { data: parties } = await supabase.rpc("get_appointment_party_names", {
      profile_ids: buyerIds,
    });
    for (const p of parties ?? []) names.set(p.id, p.full_name ?? "Student");
  }

  return rows.map((r) => ({
    id: r.id,
    startAt: r.start_at,
    endAt: r.end_at,
    status: r.status,
    note: r.note,
    buyerName: names.get(r.buyer_id) ?? "Student",
    serviceName: r.service?.name ?? null,
  }));
}

export async function getBuyerAppointments(buyerId: string): Promise<BuyerAppointment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, start_at, end_at, status, note, service:services(name), seller:sellers(business_name, slug)",
    )
    .eq("buyer_id", buyerId)
    .order("start_at");
  if (error) throw error;

  const rows = data as unknown as {
    id: string;
    start_at: string;
    end_at: string;
    status: AppointmentStatus;
    note: string | null;
    service: { name: string } | null;
    seller: { business_name: string; slug: string } | null;
  }[];

  return rows
    .filter((r) => r.seller !== null)
    .map((r) => ({
      id: r.id,
      startAt: r.start_at,
      endAt: r.end_at,
      status: r.status,
      note: r.note,
      sellerBusinessName: r.seller!.business_name,
      sellerSlug: r.seller!.slug,
      serviceName: r.service?.name ?? null,
    }));
}
