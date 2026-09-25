"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const };

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, ok: data?.role === "admin" };
}

export async function setSellerStatus(
  sellerId: string,
  status: "approved" | "hidden" | "pending",
): Promise<{ error?: string }> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Admins only." };

  const { error } = await supabase.from("sellers").update({ status }).eq("id", sellerId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}

export async function setSellerMicrosite(
  sellerId: string,
  hasMicrosite: boolean,
): Promise<{ error?: string }> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Admins only." };

  const { error } = await supabase
    .from("sellers")
    .update({ has_microsite: hasMicrosite })
    .eq("id", sellerId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}

export async function resolveReport(reportId: string): Promise<{ error?: string }> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Admins only." };

  const { error } = await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}

export async function setReviewHidden(reviewId: string, isHidden: boolean): Promise<{ error?: string }> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Admins only." };

  const { error } = await supabase.from("reviews").update({ is_hidden: isHidden }).eq("id", reviewId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}

export async function deleteReview(reviewId: string): Promise<{ error?: string }> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Admins only." };

  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}
