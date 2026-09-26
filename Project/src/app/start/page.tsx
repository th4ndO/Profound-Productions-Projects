import type { Metadata } from "next";
import { safeNextPath } from "@/lib/safe-next";
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
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  // `next` is an untrusted query param; see lib/safe-next.ts for why a
  // prefix check isn't enough.
  const safeNext = safeNextPath(next);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.brand}>Groundwork</h1>
      <StartSession next={safeNext} />
    </div>
  );
}
