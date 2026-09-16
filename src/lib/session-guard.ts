import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

/** Loads the logged-in user or redirects to /login. Use at the top of every protected page. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
