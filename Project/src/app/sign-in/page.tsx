import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./SignInForm";
import styles from "./sign-in.module.css";

export const metadata: Metadata = {
  title: "Sign in — Groundwork",
};

/**
 * Sign in to a saved account. Public (see PUBLIC_PATH_PREFIXES in
 * lib/supabase/middleware.ts), so it works on a new device before any
 * anonymous account exists; people without an account just start instead.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedInAs = user && !user.is_anonymous ? (user.email ?? null) : null;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.brand}>Groundwork</h1>
      <p className={styles.sub}>
        {signedInAs ? `You're signed in as ${signedInAs}.` : "Sign in to your account."}
      </p>
      {signedInAs && (
        <p className={styles.sub}>
          <Link href="/">Back to my goals</Link> or sign in to a different account below.
        </p>
      )}
      <SignInForm next={safeNext} />
    </div>
  );
}
