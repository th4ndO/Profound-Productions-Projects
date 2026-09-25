"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serviceSchema, micrositeSchema, availabilityRuleSchema } from "@/lib/validation";
import { normalizeSaWhatsappNumber } from "@/lib/phone";
import { validateJpegUpload } from "@/lib/imageValidation";
import { LIMITS } from "@/config";

async function requireOwnSeller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, seller: null };

  const { data: seller } = await supabase
    .from("sellers")
    .select("id, has_microsite")
    .eq("owner_id", user.id)
    .maybeSingle();
  return { supabase, user, seller };
}

export async function updateSellerBasicInfo(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const businessName = String(formData.get("businessName") ?? "").trim().slice(0, 100);
  if (businessName.length < 2) return { error: "Business name is too short." };

  const whatsappNumber = normalizeSaWhatsappNumber(String(formData.get("whatsappNumber") ?? ""));
  if (!whatsappNumber) return { error: "That doesn't look like a valid SA WhatsApp number." };

  const bio = String(formData.get("bio") ?? "").trim().slice(0, LIMITS.bioMaxChars);
  const areaNote = String(formData.get("areaNote") ?? "").trim().slice(0, 100);
  const instagramHandle = String(formData.get("instagramHandle") ?? "").trim().slice(0, 50);

  const { error } = await supabase
    .from("sellers")
    .update({
      business_name: businessName,
      bio: bio || null,
      area_note: areaNote || null,
      instagram_handle: instagramHandle || null,
      whatsapp_number: whatsappNumber,
    })
    .eq("id", seller.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function updateMicrosite(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };
  if (!seller.has_microsite) return { error: "Micro-site isn't enabled for your listing." };

  const parsed = micrositeSchema.safeParse({
    tagline: formData.get("tagline"),
    themeColor: formData.get("themeColor"),
    story: formData.get("story"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your entries." };

  const { error } = await supabase
    .from("sellers")
    .update({
      microsite_tagline: parsed.data.tagline || null,
      microsite_theme_color: parsed.data.themeColor || null,
      microsite_story: parsed.data.story || null,
    })
    .eq("id", seller.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function addService(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    priceFrom: formData.get("priceFrom"),
    priceTo: formData.get("priceTo") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid service." };

  const { error } = await supabase.from("services").insert({
    seller_id: seller.id,
    name: parsed.data.name,
    price_from: parsed.data.priceFrom,
    price_to: parsed.data.priceTo ?? null,
    duration_minutes: parsed.data.durationMinutes ?? null,
    is_active: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function deleteService(serviceId: string): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("seller_id", seller.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function addPhotos(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const { count } = await supabase
    .from("seller_photos")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", seller.id);
  const currentCount = count ?? 0;

  const files = formData
    .getAll("photos")
    .filter((p): p is File => p instanceof File && p.size > 0)
    .slice(0, Math.max(0, LIMITS.maxPortfolioPhotos - currentCount));

  for (const file of files) {
    const validationError = await validateJpegUpload(file);
    if (validationError) return { error: validationError };
  }

  let sortOrder = currentCount;
  for (const file of files) {
    const path = `${seller.id}/${sortOrder}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("seller-photos")
      .upload(path, file, { contentType: "image/jpeg" });
    if (uploadError) return { error: uploadError.message };

    const { error: rowError } = await supabase
      .from("seller_photos")
      .insert({ seller_id: seller.id, storage_path: path, sort_order: sortOrder });
    if (rowError) return { error: rowError.message };
    sortOrder++;
  }

  revalidatePath("/dashboard");
  return {};
}

export async function deletePhoto(photoId: string, storagePath: string): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  await supabase.storage.from("seller-photos").remove([storagePath]);
  const { error } = await supabase
    .from("seller_photos")
    .delete()
    .eq("id", photoId)
    .eq("seller_id", seller.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function addAvailabilityRule(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const parsed = availabilityRuleSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    slotMinutes: formData.get("slotMinutes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid availability rule." };
  if (parsed.data.endTime <= parsed.data.startTime) {
    return { error: "End time must be after start time." };
  }

  const { error } = await supabase.from("seller_availability_rules").insert({
    seller_id: seller.id,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    slot_minutes: parsed.data.slotMinutes,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function deleteAvailabilityRule(ruleId: string): Promise<{ error?: string }> {
  const { supabase, user, seller } = await requireOwnSeller();
  if (!user || !seller) return { error: "No seller profile found." };

  const { error } = await supabase
    .from("seller_availability_rules")
    .delete()
    .eq("id", ruleId)
    .eq("seller_id", seller.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

// POPIA: lets a user erase their account. Deletes seller photos from
// Storage first (their DB rows and everything else -- seller, services,
// categories, reviews they wrote, reports they filed -- cascade from the
// auth.users delete via the FK chain already in the schema), then deletes
// the auth user itself via the Admin API, which is the officially
// supported way to remove an account (a raw SQL delete on auth.users would
// bypass Supabase Auth's own internal bookkeeping).
export async function deleteOwnAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (seller) {
    const { data: photos } = await supabase
      .from("seller_photos")
      .select("storage_path")
      .eq("seller_id", seller.id);
    if (photos && photos.length > 0) {
      await supabase.storage.from("seller-photos").remove(photos.map((p) => p.storage_path));
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/");
}
