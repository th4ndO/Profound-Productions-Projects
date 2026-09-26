import type { Metadata } from "next";
import { StartSession } from "./StartSession";
import styles from "./start.module.css";

export const metadata: Metadata = {
  title: "Groundwork",
};

/**
 * Where the auth proxy sends a browser that has no session yet. There's no
 * sign-in: StartSession creates an anonymous account for this browser and
 * continues to `next`. Needs JavaScript, so crawlers that don't run it
 * never create accounts.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only follow same-site relative paths — `next` is an untrusted query
  // param, and "//host" is protocol-relative, so reject that too.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className={styles.wrap}>
      <h1 className={styles.brand}>Groundwork</h1>
      <StartSession next={safeNext} />
    </div>
  );
}
