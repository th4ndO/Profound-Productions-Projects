import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";
import { SignOutSection } from "./SignOutSection";
import styles from "./settings.module.css";

export const metadata = {
  title: "Settings — Groundwork",
};

const DEFAULT_TIMEZONE = "Africa/Johannesburg";
const DEFAULT_QUIET_START = "21:30";
const DEFAULT_QUIET_END = "07:00";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/start");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, quiet_start, quiet_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const { count: deviceCount } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true });

  return (
    <div className={styles.wrap}>
      <Link href="/" className={styles.link}>
        ‹ All goals
      </Link>
      <h1 className={styles.title}>Settings</h1>

      <SettingsForm
        timezone={profile?.timezone ?? DEFAULT_TIMEZONE}
        quietStart={(profile?.quiet_start ?? DEFAULT_QUIET_START).slice(0, 5)}
        quietEnd={(profile?.quiet_end ?? DEFAULT_QUIET_END).slice(0, 5)}
        deviceCount={deviceCount ?? 0}
      />

      <section className={`${styles.section} ${styles.dataNote}`}>
        <h2 className={styles.sectionLabel}>Your data</h2>
        <p className={styles.meta}>
          There&apos;s no account to sign in to: your goals belong to this browser. Clearing
          this site&apos;s data, or switching browser or device, starts you fresh. On iPhone,
          use Groundwork from its Home Screen icon — it keeps separate data from Safari.
        </p>
      </section>

      <section className={`${styles.section} ${styles.dataNote}`}>
        <h2 className={styles.sectionLabel}>Sign out</h2>
        <SignOutSection />
      </section>
    </div>
  );
}
