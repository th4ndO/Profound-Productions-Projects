import { GoalVisual, THEME_HINTS, THEME_NAMES, THEMES } from "@/components/visuals/GoalVisual";
import styles from "./page.module.css";

export const metadata = {
  title: "Visuals — dev",
};

const P_VALUES = [0, 0.25, 0.5, 0.75, 1];

/**
 * Dev-only verification page (Phase 2, BUILD SPEC §8): every theme's
 * visual at p = 0, 0.25, 0.5, 0.75, 1, for eyeballing against
 * reference/groundwork.html. Not linked from real app navigation.
 */
export default function DevVisualsPage() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Visuals</h1>
      <p className={styles.intro}>
        Every theme at p = 0, 0.25, 0.5, 0.75, and 1 — compare by eye against
        reference/groundwork.html, in both light and dark.
      </p>
      {THEMES.map((theme) => (
        <section key={theme} className={styles.themeSection}>
          <h2 className={styles.themeHeading}>{THEME_NAMES[theme]}</h2>
          <p className={styles.themeHint}>{THEME_HINTS[theme]}</p>
          <div className={styles.row}>
            {P_VALUES.map((p) => (
              <div className={styles.cell} key={p}>
                <GoalVisual theme={theme} p={p} label={`${THEME_NAMES[theme]}, ${Math.round(p * 100)} percent`} />
                <p className={styles.pLabel}>p = {p}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
