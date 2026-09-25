import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Project } from "@/lib/types";

// Public, anonymous, cookie-free client — safe to use inside unstable_cache
// since it never touches per-request state. Used only for published-project
// reads on public pages, so results can be cached and reused across visitors.
function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const getPublishedProjects = unstable_cache(
  async (): Promise<{ projects: Project[]; error: string | null }> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return { projects: [], error: error.message };
    return { projects: (data ?? []) as Project[], error: null };
  },
  ["published-projects"],
  { tags: ["projects"], revalidate: 300 }
);
