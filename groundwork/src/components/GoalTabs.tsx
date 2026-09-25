import Link from "next/link";
import styles from "./GoalTabs.module.css";

/**
 * Ported from the prototype's `<div class="tabs" role="tablist">` — real
 * routes here ("/" and "/ideas") instead of the prototype's client-side
 * `state.tab` switch.
 */
export function GoalTabs({ active }: { active: "mine" | "ideas" }) {
  return (
    <div className={styles.tabs} role="tablist">
      <Link href="/" role="tab" aria-selected={active === "mine"} className={styles.tab}>
        My goals
      </Link>
      <Link href="/ideas" role="tab" aria-selected={active === "ideas"} className={styles.tab}>
        Goal ideas
      </Link>
    </div>
  );
}
