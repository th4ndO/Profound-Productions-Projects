export default function CropMarks({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      {/* top-left */}
      <span className="absolute left-0 top-0 h-3 w-px -translate-x-[6px] bg-accent/70" />
      <span className="absolute left-0 top-0 h-px w-3 -translate-y-[6px] bg-accent/70" />
      {/* top-right */}
      <span className="absolute right-0 top-0 h-3 w-px translate-x-[6px] bg-accent/70" />
      <span className="absolute right-0 top-0 h-px w-3 -translate-y-[6px] bg-accent/70" />
      {/* bottom-left */}
      <span className="absolute bottom-0 left-0 h-3 w-px -translate-x-[6px] bg-accent/70" />
      <span className="absolute bottom-0 left-0 h-px w-3 translate-y-[6px] bg-accent/70" />
      {/* bottom-right */}
      <span className="absolute bottom-0 right-0 h-3 w-px translate-x-[6px] bg-accent/70" />
      <span className="absolute bottom-0 right-0 h-px w-3 translate-y-[6px] bg-accent/70" />
    </div>
  );
}
