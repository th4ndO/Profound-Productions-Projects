import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoalVisual, type Theme } from "@/components/visuals/GoalVisual";
import { gProg, pct, type Milestone } from "@/lib/progress";
import { statusLine } from "@/lib/status";
import { dueStatus, dueStatusText } from "@/lib/due";
import styles from "./page.module.css";

interface GoalCardRow {
  id: string;
  title: string;
  theme: Theme;
  due_at: string | null;
  milestones: Milestone[];
}

/**
 * "My goals" — the real authenticated home page (BUILD SPEC §5). Replaces
 * the Phase 1 placeholder. A grid of goal cards (visual, title, progress
 * bar, status line, days-left/overdue text), or an empty state pointing
 * at "New goal" when there aren't any yet.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: middleware already redirects unauthenticated
  // visitors, but Server Components should never assume that ran.
  if (!user) {
    redirect("/sign-in");
  }

  const { data } = await supabase
    .from("goals")
    .select("id, title, theme, due_at, milestones(done, tasks(done))")
    .order("created_at", { ascending: true });

  const goals = (data ?? []) as GoalCardRow[];

  return (
    <div className={styles.wrap}>
      <header className={styles.top}>
        <h1 className={styles.brand}>Groundwork</h1>
        <div className={styles.actions}>
          <ThemeToggle className={styles.actions} buttonClassName={styles.ghost} />
          <SignOutButton className={styles.ghost} />
        </div>
      </header>

      <div className={styles.headerRow}>
        <h2 className={styles.pageHeading}>My goals</h2>
        <Link href="/goals/new" className={styles.btn}>
          New goal
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className={styles.empty}>
          <p>
            Pick one big goal, break it into milestones, and watch it grow as
            you finish them.
          </p>
          <Link href="/goals/new" className={styles.btn}>
            New goal
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {goals.map((g) => {
            const p = gProg(g);
            const due = dueStatus(g.due_at, p);
            return (
              <Link key={g.id} href={`/goals/${g.id}`} className={styles.card}>
                <GoalVisual theme={g.theme} p={p} label={`${g.title}, ${pct(p)} percent`} />
                <h2>{g.title}</h2>
                <div className={styles.bar}>
                  <i style={{ width: `${pct(p)}%` }} />
                </div>
                <p className={styles.meta}>
                  {statusLine(g)}
                  {due.kind !== "none" && (
                    <>
                      <br />
                      {due.kind === "late" ? (
                        <span className={styles.late}>{dueStatusText(due)}</span>
                      ) : (
                        dueStatusText(due)
                      )}
                    </>
                  )}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
