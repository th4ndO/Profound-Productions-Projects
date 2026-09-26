"use client";

import { useRouter } from "next/navigation";
import { CATEGORIES, isCategory, type Category } from "@/lib/ideas";
import { TIMEFRAMES, TIMEFRAME_LABELS, type Timeframe } from "@/lib/timeframe";
import { ideasHref } from "./href";
import styles from "./ideas.module.css";

function asTimeframe(value: string): Timeframe | "all" {
  return (TIMEFRAMES as readonly string[]).includes(value) ? (value as Timeframe) : "all";
}

/**
 * Category and time frame dropdowns. Changing either navigates straight
 * away. It's also a plain GET form to /ideas (same `cat`/`tf` params), so
 * the Apply button works if JavaScript hasn't loaded.
 */
export function IdeaFilters({ cat, tf }: { cat: Category | "all"; tf: Timeframe | "all" }) {
  const router = useRouter();

  function go(nextCat: Category | "all", nextTf: Timeframe | "all") {
    router.push(ideasHref(nextCat, nextTf), { scroll: false });
  }

  return (
    <form action="/ideas" method="get" className={styles.filterForm}>
      <label className={styles.filterField}>
        <span className={styles.filterLabel}>Category</span>
        <select
          name="cat"
          value={cat}
          onChange={(e) => go(isCategory(e.target.value) ? e.target.value : "all", tf)}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterField}>
        <span className={styles.filterLabel}>Time frame</span>
        <select name="tf" value={tf} onChange={(e) => go(cat, asTimeframe(e.target.value))}>
          <option value="all">Any time frame</option>
          {TIMEFRAMES.map((t) => (
            <option key={t} value={t}>
              {TIMEFRAME_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className={styles.chip}>
          Apply
        </button>
      </noscript>
    </form>
  );
}
