import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm">
      <h1 className="mb-1 text-center text-xl font-semibold text-brand-700">
        Student Budget Planner
      </h1>
      <p className="mb-6 text-center text-sm text-slate-500">
        Budgeting for irregular student income.
      </p>
      <LoginForm />
      <p className="mt-4 rounded-lg bg-slate-100 p-3 text-center text-xs text-slate-500">
        Seeded demo login — see README for the current credentials.
      </p>
    </div>
  );
}
