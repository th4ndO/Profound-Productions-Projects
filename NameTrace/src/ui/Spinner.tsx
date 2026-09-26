/** Emerald pulse spinner. */
export function Spinner({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <span role={label ? 'status' : undefined} className={`inline-flex items-center gap-3 ${className}`}>
      <span aria-hidden className="relative inline-flex size-4">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-mint/60" />
        <span className="relative m-auto size-2.5 rounded-full bg-mint shadow-[0_0_12px_var(--color-mint)]" />
      </span>
      {label && <span className="text-sm text-muted">{label}</span>}
    </span>
  );
}
