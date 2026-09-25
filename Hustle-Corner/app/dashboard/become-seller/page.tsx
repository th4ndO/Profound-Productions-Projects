import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCategories } from "@/lib/sellers";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function BecomeSellerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing) redirect("/dashboard");

  const categories = await getActiveCategories();

  return <OnboardingWizard categories={categories} />;
}
