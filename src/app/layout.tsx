import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Budget Planner",
  description: "Budgeting for irregular student income — loans, bursaries, and allowances.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-[--color-bg] text-[--color-fg] antialiased">
        {user ? <NavBar email={user.email} /> : null}
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
