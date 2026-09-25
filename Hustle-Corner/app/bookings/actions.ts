"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Confirm/decline are seller-only actions; the actual enforcement is the
// appointments_protect_privileged_columns trigger (0012) -- these checks
// exist to give a clearer error message than a raw RLS/trigger failure.
async function requireOwnSellerAppointment(appointmentId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { supabase, user: null, ok: false as const };

  const { data } = await supabase
    .from("appointments")
    .select("id, seller:sellers!inner(owner_id)")
    .eq("id", appointmentId)
    .maybeSingle();

  const seller = data?.seller as unknown as { owner_id: string } | null;
  return { supabase, user, ok: seller?.owner_id === user.id };
}

export async function confirmAppointment(appointmentId: string): Promise<{ error?: string }> {
  const { supabase, user, ok } = await requireOwnSellerAppointment(appointmentId);
  if (!user) return { error: "You need to be logged in." };
  if (!ok) return { error: "That appointment isn't on your listing." };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", appointmentId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function declineAppointment(appointmentId: string): Promise<{ error?: string }> {
  const { supabase, user, ok } = await requireOwnSellerAppointment(appointmentId);
  if (!user) return { error: "You need to be logged in." };
  if (!ok) return { error: "That appointment isn't on your listing." };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "declined" })
    .eq("id", appointmentId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function cancelAppointment(appointmentId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  return {};
}
