import type { Metadata } from "next";
import { GoalVisual, THEMES, THEME_NAMES } from "@/components/visuals/GoalVisual";
import { SignInForm } from "./SignInForm";
import styles from "./sign-in.module.css";

export const metadata: Metadata = {
  title: "Sign in · Groundwork",
};

// One of each goal theme, at rising progress, so the sign-in page shows what
// the app actually does (things grow as you tick off milestones) instead of
// a generic illustration.
const SHOWCASE_PROGRESS = [0.35, 0.55, 0.7, 0.85, 0.95, 1];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className={styles.page}>
      <main className={styles.wrap}>
        <ul className={styles.showcase} aria-label="Goal themes">
          {THEMES.map((theme, i) => (
            <li key={theme} className={styles.tile} style={{ animationDelay: `${i * 70}ms` }}>
              <GoalVisual
                theme={theme}
                p={SHOWCASE_PROGRESS[i]}
                label={`${THEME_NAMES[theme]} goal`}
              />
            </li>
          ))}
        </ul>

        <div className={styles.card}>
          <h1 className={styles.brand}>Groundwork</h1>
          <p className={styles.sub}>
            Break a goal into milestones and watch it grow as you tick them off.
          </p>
          <SignInForm initialError={error} next={next} />
        </div>

        <ul className={styles.features}>
          <li>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            Milestones and tasks
          </li>
          <li>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21v-8M12 13c0-4 3-6 7-6 0 4-3 6-7 6zM12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" />
            </svg>
            Visual progress
          </li>
          <li>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 004 0" />
            </svg>
            Gentle reminders
          </li>
        </ul>
      </main>
    </div>
  );
}
