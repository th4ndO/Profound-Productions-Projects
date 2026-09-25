"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sellerOnboardingSchema, serviceSchema } from "@/lib/validation";
import { normalizeSaWhatsappNumber } from "@/lib/phone";
import { validateJpegUpload } from "@/lib/imageValidation";
import { CAMPUS_SLUG, LIMITS } from "@/config";
import { z } from "zod";

export async function onboardSeller(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be logged in." };

  const { data: existing } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing) return { error: "You already have a seller profile." };

  let services: z.infer<typeof serviceSchema>[];
  try {
    services = JSON.parse(String(formData.get("servicesJson") ?? "[]"));
  } catch {
    return { error: "Invalid services data." };
  }

  const whatsappNumber = normalizeSaWhatsappNumber(String(formData.get("whatsappNumber") ?? ""));
  if (!whatsappNumber) {
    return { error: "That doesn't look like a valid South African WhatsApp number." };
  }

  const parsed = sellerOnboardingSchema.safeParse({
    businessName: formData.get("businessName"),
    bio: formData.get("bio"),
    areaNote: formData.get("areaNote"),
    instagramHandle: formData.get("instagramHandle"),
    whatsappNumber,
    categorySlugs: formData.getAll("categorySlugs"),
    services,
    consent: formData.get("consent") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const input = parsed.data;

  const photoFiles = formData
    .getAll("photos")
    .filter((p): p is File => p instanceof File && p.size > 0)
    .slice(0, LIMITS.maxPortfolioPhotos);
  if (photoFiles.length < LIMITS.minPhotosToOnboard) {
    return { error: "Add at least one photo." };
  }
  for (const file of photoFiles) {
    const validationError = await validateJpegUpload(file);
    if (validationError) return { error: validationError };
  }

  const { data: campus } = await supabase
    .from("campuses")
    .select("id")
    .eq("slug", CAMPUS_SLUG)
    .maybeSingle();
  if (!campus) return { error: "Campus is not configured yet." };

  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", input.categorySlugs);
  if (!categories || categories.length !== input.categorySlugs.length) {
    return { error: "One of the selected categories is invalid." };
  }

  const slug =
    input.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 8);

  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .insert({
      owner_id: user.id,
      campus_id: campus.id,
      business_name: input.businessName,
      slug,
      bio: input.bio || null,
      area_note: input.areaNote || null,
      instagram_handle: input.instagramHandle || null,
      whatsapp_number: whatsappNumber,
      status: "pending",
    })
    .select("id")
    .single();
  if (sellerError || !seller) {
    return { error: sellerError?.message ?? "Could not create your seller profile." };
  }

  async function rollback() {
    await supabase.from("sellers").delete().eq("id", seller!.id);
  }

  const { error: categoriesError } = await supabase
    .from("seller_categories")
    .insert(categories.map((c) => ({ seller_id: seller.id, category_id: c.id })));
  if (categoriesError) {
    await rollback();
    return { error: categoriesError.message };
  }

  const { error: servicesError } = await supabase.from("services").insert(
    input.services.map((s) => ({
      seller_id: seller.id,
      name: s.name,
      price_from: s.priceFrom,
      price_to: s.priceTo ?? null,
      duration_minutes: s.durationMinutes ?? null,
      is_active: true,
    })),
  );
  if (servicesError) {
    await rollback();
    return { error: servicesError.message };
  }

  let sortOrder = 0;
  for (const photo of photoFiles) {
    const path = `${seller.id}/${sortOrder}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("seller-photos")
      .upload(path, photo, { contentType: "image/jpeg" });
    if (uploadError) {
      await rollback();
      return { error: uploadError.message };
    }
    const { error: photoRowError } = await supabase
      .from("seller_photos")
      .insert({ seller_id: seller.id, storage_path: path, sort_order: sortOrder });
    if (photoRowError) {
      await rollback();
      return { error: photoRowError.message };
    }
    sortOrder++;
  }

  redirect("/dashboard");
}
