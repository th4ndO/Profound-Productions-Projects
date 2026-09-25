"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema, reportSchema, bookAppointmentSchema } from "@/lib/validation";

export async function submitReview(
  sellerId: string,
  slug: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in to leave a review." };

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your review and try again." };
  }

  const { error } = await supabase.from("reviews").insert({
    seller_id: sellerId,
    author_id: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already reviewed this seller." };
    return { error: error.message };
  }

  revalidatePath(`/s/${slug}`);
  return {};
}

export async function deleteOwnReview(reviewId: string, slug: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("author_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/s/${slug}`);
  return {};
}

export async function submitReport(
  sellerId: string,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in to report a listing." };

  const parsed = reportSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please describe the issue." };
  }

  const { error } = await supabase.from("reports").insert({
    seller_id: sellerId,
    reporter_id: user.id,
    reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  return { success: true };
}

export async function bookAppointment(
  sellerId: string,
  slug: string,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in to request an appointment." };

  const parsed = bookAppointmentSchema.safeParse({
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    serviceId: formData.get("serviceId"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please pick a valid time." };
  }
  if (new Date(parsed.data.startAt).getTime() <= Date.now()) {
    return { error: "That time has already passed -- pick another slot." };
  }

  const { error } = await supabase.from("appointments").insert({
    seller_id: sellerId,
    buyer_id: user.id,
    service_id: parsed.data.serviceId || null,
    start_at: parsed.data.startAt,
    end_at: parsed.data.endAt,
    note: parsed.data.note || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "That slot was just booked by someone else -- pick another." };
    }
    return { error: error.message };
  }

  revalidatePath(`/s/${slug}`);
  return { success: true };
}
