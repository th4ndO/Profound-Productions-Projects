import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoalTabs } from "@/components/GoalTabs";
import { GoalVisual } from "@/components/visuals/GoalVisual";
import { CATEGORIES, CATEGORY_LABELS, IDEAS, isCategory, type Category } from "@/lib/ideas";
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
 * `ideasHTML()`. Filters are search params so the page stays a plain
 * Server Component: `?cat=` (category) and `?tf=` (time frame), which
 * combine. `?filter=` is the old name for `?tf=`, still accepted so
 * existing links keep working.
 */
function ideasHref(cat: Category | "all", tf: Timeframe | "all") {
  const params = new URLSearchParams();
  if (cat !== "all") params.set("cat", cat);
  if (tf !== "all") params.set("tf", tf);
  const qs = params.toString();
  return qs ? `/ideas?${qs}` : "/ideas";
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; tf?: string; filter?: string }>;
}) {
  const { cat: catRaw, tf: tfRaw, filter: legacyTf } = await searchParams;
  const tfValue = tfRaw ?? legacyTf;
  const filter: Timeframe | "all" = tfValue && isTimeframe(tfValue) ? tfValue : "all";
  const cat: Category | "all" = catRaw && isCategory(catRaw) ? catRaw : "all";

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
  const matching = cat === "all" ? IDEAS : IDEAS.filter((i) => i.cat === cat);
  const visibleCount = matching.filter((i) => timeframesToShow.includes(i.tf)).length;

  return (
    <div className={styles.wrap}>
      <header className={styles.top}>
        <h1 className={styles.brand}>Groundwork</h1>
        <div className={styles.actions}>
          <ThemeToggle className={styles.actions} buttonClassName={styles.chip} />
        </div>
      </header>

      <GoalTabs active="ideas" />

      <p className={styles.filterLabel} id="cat-filter-label">
        Category
      </p>
      <div className={styles.filters} role="group" aria-labelledby="cat-filter-label">
        <Link href={ideasHref("all", filter)} className={styles.chip} aria-pressed={cat === "all"}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={ideasHref(c.id, filter)} className={styles.chip} aria-pressed={cat === c.id}>
            {c.label}
          </Link>
        ))}
      </div>

      <p className={styles.filterLabel} id="tf-filter-label">
        Time frame
      </p>
      <div className={styles.filters} role="group" aria-labelledby="tf-filter-label">
        <Link href={ideasHref(cat, "all")} className={styles.chip} aria-pressed={filter === "all"}>
          Any
        </Link>
        {TIMEFRAMES.map((tf) => (
          <Link key={tf} href={ideasHref(cat, tf)} className={styles.chip} aria-pressed={filter === tf}>
            {TIMEFRAME_LABELS[tf]}
          </Link>
        ))}
      </div>

      {visibleCount === 0 ? (
        <p className={styles.none}>
          No ideas match both filters yet.{" "}
          <Link href={ideasHref(cat, "all")}>Show every time frame</Link>
        </p>
      ) : null}

      {timeframesToShow.map((tf) => {
        const list = matching.filter((i) => i.tf === tf);
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
                        <span className={styles.cat}>{CATEGORY_LABELS[idea.cat]}</span>
                      </div>
                    </div>
                    <p>{idea.why}</p>
                    {idea.evidence ? (
                      <p className={styles.evidence}>
                        <b>Evidence</b> {idea.evidence}
                      </p>
                    ) : null}
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
