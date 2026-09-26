import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** Bottom sheet for small screens. Traps focus and closes on Escape or backdrop tap. */
export function Drawer({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement;
    panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      restore.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <div className="absolute inset-0 bg-obsidian/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-edge bg-charcoal px-4 pt-3 pb-8 shadow-2xl motion-safe:animate-[sheet-in_220ms_ease-out]"
      >
        <div className="sticky top-0 -mx-4 mb-2 flex items-center justify-between bg-charcoal px-4 pb-2">
          <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-edge" />
          <button type="button" data-autofocus onClick={onClose} aria-label="Close preview" className="absolute right-3 grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
