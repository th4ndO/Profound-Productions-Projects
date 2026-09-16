import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./page.module.css";

/**
 * Placeholder home page for Phase 1. Real content (My goals / Goal ideas /
 * etc.) is a later phase — this exists to prove route protection and the
 * ported theme tokens/fonts work, in both light and dark.
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

  return (
    <div className={styles.wrap}>
      <header className={styles.top}>
        <h1 className={styles.brand}>Groundwork</h1>
        <div className={styles.actions}>
          <ThemeToggle className={styles.actions} />
          <SignOutButton className={styles.ghost} />
        </div>
      </header>

      <div className={styles.card}>
        <h2>Signed in</h2>
        <p>{user.email}</p>
      </div>

      <div className={styles.card}>
        <h2>Theme tokens</h2>
        <p>
          Display font (Bricolage Grotesque) and body font (Atkinson
          Hyperlegible) are wired via next/font/google into the ported
          --display / --body variables. Colors below come straight from the
          prototype&apos;s tokens and respond to system dark mode or the
          toggle above.
        </p>
        <div className={styles.swatches}>
          <span className={styles.swatch} style={{ background: "var(--bg)" }} />
          <span className={styles.swatch} style={{ background: "var(--surface)" }} />
          <span className={styles.swatch} style={{ background: "var(--accent)" }} />
          <span className={styles.swatch} style={{ background: "var(--soft)" }} />
          <span className={styles.swatch} style={{ background: "var(--leaf)" }} />
          <span className={styles.swatch} style={{ background: "var(--fruit)" }} />
        </div>
      </div>
    </div>
  );
}
