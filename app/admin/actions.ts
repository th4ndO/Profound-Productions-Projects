"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import type { ProjectCategory, ProjectSubcategory } from "@/lib/types";

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 80;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return supabase;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function uploadProjectImage(formData: FormData) {
  const supabase = await requireUser();

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided.", url: null };

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const webpBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const fileName = `${crypto.randomUUID()}.webp`;
  const webpBlob = new Blob([new Uint8Array(webpBuffer)], { type: "image/webp" });

  const { error } = await supabase.storage
    .from("project-images")
    .upload(fileName, webpBlob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/webp",
    });

  if (error) {
    return { error: error.message, url: null };
  }

  const { data } = supabase.storage.from("project-images").getPublicUrl(fileName);
  return { error: null, url: data.publicUrl };
}

export async function createProject(formData: {
  title: string;
  description: string;
  category: ProjectCategory;
  subcategory: ProjectSubcategory | null;
  client_name: string;
  image_url: string;
  website_url: string;
  display_order: number;
  is_published: boolean;
}) {
  const supabase = await requireUser();

  const { error } = await supabase.from("projects").insert({
    title: formData.title,
    description: formData.description || null,
    category: formData.category,
    subcategory: formData.subcategory,
    client_name: formData.client_name || null,
    image_url: formData.image_url,
    website_url: formData.website_url || null,
    display_order: formData.display_order,
    is_published: formData.is_published,
  });

  if (error) return { error: error.message };

  revalidateTag("projects", "minutes");
  revalidatePath("/portfolio");
  revalidatePath("/contact");
  revalidatePath("/admin");
  return { error: null };
}

export async function createProjects(
  items: {
    title: string;
    description: string;
    category: ProjectCategory;
    subcategory: ProjectSubcategory | null;
    client_name: string;
    image_url: string;
    website_url: string;
    display_order: number;
    is_published: boolean;
  }[]
) {
  const supabase = await requireUser();

  const { error } = await supabase.from("projects").insert(
    items.map((item) => ({
      title: item.title,
      description: item.description || null,
      category: item.category,
      subcategory: item.subcategory,
      client_name: item.client_name || null,
      image_url: item.image_url,
      website_url: item.website_url || null,
      display_order: item.display_order,
      is_published: item.is_published,
    }))
  );

  if (error) return { error: error.message };

  revalidateTag("projects", "minutes");
  revalidatePath("/portfolio");
  revalidatePath("/contact");
  revalidatePath("/admin");
  return { error: null };
}

export async function updateProject(
  id: string,
  formData: {
    title: string;
    description: string;
    category: ProjectCategory;
    subcategory: ProjectSubcategory | null;
    client_name: string;
    image_url: string;
    website_url: string;
    display_order: number;
    is_published: boolean;
  }
) {
  const supabase = await requireUser();

  const { error } = await supabase
    .from("projects")
    .update({
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      subcategory: formData.subcategory,
      client_name: formData.client_name || null,
      image_url: formData.image_url,
      website_url: formData.website_url || null,
      display_order: formData.display_order,
      is_published: formData.is_published,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateTag("projects", "minutes");
  revalidatePath("/portfolio");
  revalidatePath("/contact");
  revalidatePath("/admin");
  return { error: null };
}

export async function deleteProject(id: string) {
  const supabase = await requireUser();

  const { data: project } = await supabase
    .from("projects")
    .select("image_url")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) return { error: error.message };

  const storagePath = project?.image_url.split("/project-images/")[1];
  if (storagePath) {
    // Best-effort: the row is already gone, so a storage hiccup here
    // shouldn't be reported back as a failed delete.
    await supabase.storage.from("project-images").remove([storagePath]);
  }

  revalidateTag("projects", "minutes");
  revalidatePath("/portfolio");
  revalidatePath("/contact");
  revalidatePath("/admin");
  return { error: null };
}

