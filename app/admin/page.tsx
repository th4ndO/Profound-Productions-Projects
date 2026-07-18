import { createClient } from "@/lib/supabase/server";
import ProjectManager from "@/components/admin/project-manager";
import { signOut } from "@/app/admin/actions";
import type { Project } from "@/lib/types";

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <section className="mx-auto max-w-5xl px-6 py-12 md:px-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-paper">Portfolio Manager</h1>
          <p className="font-mono text-xs text-neutral">
            {projects?.length ?? 0} project{projects?.length === 1 ? "" : "s"}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-sm border border-surface-line px-4 py-2 font-mono text-xs uppercase tracking-wide text-neutral hover:border-paper/40 hover:text-paper"
          >
            Sign out
          </button>
        </form>
      </div>

      <ProjectManager initialProjects={(projects ?? []) as Project[]} />
    </section>
  );
}
