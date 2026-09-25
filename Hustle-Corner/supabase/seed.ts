// Local development seed data ONLY. Never run this against production.
// Usage: npm run seed  (requires .env.local with SUPABASE_SERVICE_ROLE_KEY set)

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
import { CAMPUS_NAME, CAMPUS_SLUG } from "../config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
}

const supabase = createClient(url, serviceRoleKey);

const CATEGORIES = [
  { name: "Hair", slug: "hair", is_active: true, sort_order: 1 },
  { name: "Nails", slug: "nails", is_active: true, sort_order: 2 },
  { name: "Tutoring", slug: "tutoring", is_active: false, sort_order: 3 },
  { name: "Makeup", slug: "makeup", is_active: false, sort_order: 4 },
  { name: "Photography", slug: "photography", is_active: false, sort_order: 5 },
];

const FAKE_SELLERS = [
  { name: "Thandi's Braids", category: "hair", bio: "Knotless braids, cornrows and weaves. 3 years experience.", services: [{ name: "Knotless braids (medium)", from: 450, to: 650 }, { name: "Cornrows", from: 150, to: 250 }] },
  { name: "Nail Bar by Lerato", category: "nails", bio: "Gel nails, acrylics and nail art done in my res room.", services: [{ name: "Full set acrylics", from: 300, to: 400 }, { name: "Gel overlay", from: 200, to: 250 }] },
  { name: "Kutlwano Hair Studio", category: "hair", bio: "Silk press, treatments and natural hair care.", services: [{ name: "Silk press", from: 200, to: 300 }, { name: "Deep condition treatment", from: 150, to: 150 }] },
  { name: "Glow Nails UP", category: "nails", bio: "Affordable student prices, quick turnaround.", services: [{ name: "Basic manicure", from: 120, to: 120 }, { name: "Gel polish", from: 180, to: 180 }] },
  { name: "Braids by Bontle", category: "hair", bio: "Box braids, boho braids, extensions available.", services: [{ name: "Box braids (long)", from: 550, to: 750 }] },
  { name: "Precious Nail Art", category: "nails", bio: "Custom nail art and press-ons.", services: [{ name: "Custom nail art set", from: 350, to: 500 }] },
  { name: "Refilwe's Twists", category: "hair", bio: "Passion twists and faux locs specialist.", services: [{ name: "Passion twists", from: 500, to: 700 }] },
  { name: "Hatfield Hair Lounge", category: "hair", bio: "Weekend appointments, walk-ins welcome.", services: [{ name: "Wash and blow dry", from: 100, to: 150 }] },
  { name: "Nandi Nails & Beauty", category: "nails", bio: "Nails, lashes and brows in one visit.", services: [{ name: "Full set + lash tint", from: 400, to: 400 }] },
  { name: "Campus Curls", category: "hair", bio: "Curly hair cuts and definition styling.", services: [{ name: "Curly cut and style", from: 250, to: 350 }] },
];

async function main() {
  console.log("Seeding CampusHustle local dev data...");

  const { data: campus, error: campusError } = await supabase
    .from("campuses")
    .upsert({ name: CAMPUS_NAME, slug: CAMPUS_SLUG }, { onConflict: "slug" })
    .select()
    .single();
  if (campusError) throw campusError;

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .upsert(CATEGORIES, { onConflict: "slug" })
    .select();
  if (categoriesError) throw categoriesError;

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  for (let i = 0; i < FAKE_SELLERS.length; i++) {
    const fake = FAKE_SELLERS[i];
    const email = `seed-seller-${i + 1}@example.test`;

    const { data: existing } = await supabase.auth.admin.listUsers();
    let authUser = existing.users.find((u) => u.email === email);

    if (!authUser) {
      const { data: created, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          password: crypto.randomUUID(),
        });
      if (createError) throw createError;
      authUser = created.user;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authUser.id,
      full_name: fake.name,
      email,
      is_verified: true,
      role: "student",
    });
    if (profileError) throw profileError;

    const slug = fake.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .upsert(
        {
          owner_id: authUser.id,
          campus_id: campus.id,
          business_name: fake.name,
          slug,
          bio: fake.bio,
          whatsapp_number: "+27600000" + String(100 + i).padStart(3, "0"),
          area_note: "Hatfield",
          status: "approved",
        },
        { onConflict: "owner_id" },
      )
      .select()
      .single();
    if (sellerError) throw sellerError;

    const category = categoryBySlug.get(fake.category);
    if (category) {
      await supabase
        .from("seller_categories")
        .upsert({ seller_id: seller.id, category_id: category.id });
    }

    await supabase.from("services").delete().eq("seller_id", seller.id);
    await supabase.from("services").insert(
      fake.services.map((s) => ({
        seller_id: seller.id,
        name: s.name,
        price_from: s.from,
        price_to: s.to,
        is_active: true,
      })),
    );

    console.log(`  seeded: ${fake.name}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
