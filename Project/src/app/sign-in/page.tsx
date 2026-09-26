import type { Metadata } from "next";
import { SignInForm } from "./SignInForm";
import styles from "./sign-in.module.css";

export const metadata: Metadata = {
  title: "Sign in · Groundwork",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.brand}>Groundwork</h1>
      <p className={styles.sub}>Sign in with your email and password.</p>
      <SignInForm next={next} />
    </div>
  );
}
