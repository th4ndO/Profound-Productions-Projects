import { Search, X } from 'lucide-react';
import { forwardRef } from 'react';

export const SearchBox = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; onSubmit: () => void; onClear: () => void; disabled?: boolean; listId?: string }
>(function SearchBox({ value, onChange, onSubmit, onClear, disabled, listId }, ref) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="nt-search" className="mb-1.5 block text-sm font-medium text-ink">
        Name to find
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
        <input
          ref={ref}
          id="nt-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && value) {
              e.preventDefault();
              onClear();
            }
          }}
          placeholder="For example, Sarah Connor"
          autoComplete="off"
          spellCheck={false}
          list={listId}
          aria-describedby="nt-search-hint"
          disabled={disabled}
          className="h-14 w-full rounded-xl border border-edge bg-charcoal pr-12 pl-12 text-lg text-ink placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <p id="nt-search-hint" className="mt-1.5 hidden text-xs text-muted lg:block">
        Press <kbd className="rounded border border-edge px-1 font-sans">/</kbd> or <kbd className="rounded border border-edge px-1 font-sans">Ctrl K</kbd> to jump here, and Esc to clear.
      </p>
    </form>
  );
});
