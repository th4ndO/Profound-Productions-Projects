import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoalTabs } from "@/components/GoalTabs";
import { GoalVisual } from "@/components/visuals/GoalVisual";
import { IDEAS } from "@/lib/ideas";
import { TIMEFRAMES, TIMEFRAME_LABELS, TIMEFRAME_SUB, type Timeframe } from "@/lib/timeframe";
import { adoptIdea } from "@/app/goals/actions";
import styles from "./ideas.module.css";

export const metadata = {
  title: "Goal ideas — Groundwork",
};

function isTimeframe(value: string): value is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(value);
}

interface IdeaGoalRow {
  idea_id: string | null;
}

/**
 * "Goal ideas" (BUILD SPEC §6) — ported from reference/groundwork.html's
 * `ideasHTML()`. The prototype filters client-side with `state.filter`;
 * here the filter is a `?filter=` search param so the page stays a plain
 * Server Component, consistent with the rest of the app.
 */
export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterRaw } = await searchParams;
  const filter: Timeframe | "all" = filterRaw && isTimeframe(filterRaw) ? filterRaw : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/start");
  }

  const { data } = await supabase.from("goals").select("idea_id").not("idea_id", "is", null);
  const added = new Set(((data ?? []) as IdeaGoalRow[]).map((g) => g.idea_id));

  const timeframesToShow = filter === "all" ? TIMEFRAMES : [filter];

  return (
    <div className={styles.wrap}>
      <header className={styles.top}>
        <h1 className={styles.brand}>Groundwork</h1>
        <div className={styles.actions}>
          <ThemeToggle className={styles.actions} buttonClassName={styles.chip} />
        </div>
      </header>

      <GoalTabs active="ideas" />

      <div className={styles.filters} role="group" aria-label="Filter by time frame">
        <Link href="/ideas" className={styles.chip} aria-pressed={filter === "all"}>
          All
        </Link>
        {TIMEFRAMES.map((tf) => (
          <Link key={tf} href={`/ideas?filter=${tf}`} className={styles.chip} aria-pressed={filter === tf}>
            {TIMEFRAME_LABELS[tf]}
          </Link>
        ))}
      </div>

      {timeframesToShow.map((tf) => {
        const list = IDEAS.filter((i) => i.tf === tf);
        if (!list.length) return null;
        return (
          <section key={tf}>
            <h2 className={styles.tfHead}>{TIMEFRAME_LABELS[tf]}</h2>
            <p className={styles.tfSub}>{TIMEFRAME_SUB[tf]}</p>
            <div className={styles.ideas}>
              {list.map((idea) => {
                const alreadyAdded = added.has(idea.id);
                return (
                  <article key={idea.id} className={styles.idea}>
                    <div className={styles.ideaTop}>
                      <GoalVisual theme={idea.theme} p={0.75} label="" />
                      <div>
                        <h3>{idea.title}</h3>
                        <span className={styles.cat}>{idea.cat}</span>
                      </div>
                    </div>
                    <p>{idea.why}</p>
                    <div className={styles.reward}>
                      <b>Reward</b>
                      <span>{idea.reward}</span>
                    </div>
                    <details>
                      <summary>{idea.ms.length} milestones</summary>
                      <ol>
                        {idea.ms.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ol>
                    </details>
                    {alreadyAdded ? (
                      <button className={styles.btn} disabled>
                        In your goals
                      </button>
                    ) : (
                      <form action={adoptIdea.bind(null, idea.id)}>
                        <button type="submit" className={styles.btn}>
                          Add to my goals
                        </button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
