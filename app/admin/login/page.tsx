import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 font-display text-2xl text-paper">Admin</h1>
      <p className="mb-8 font-mono text-xs text-neutral">
        Sign in to manage the portfolio.
      </p>
      <LoginForm />
    </section>
  );
}
