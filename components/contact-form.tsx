"use client";

import { useMemo, useState } from "react";

const WHATSAPP_NUMBER = "27764469804";

const PROJECT_TYPES = [
  "Poster / Flyer",
  "Product / Brand Design",
  "Personal Branding",
  "Event Promo",
  "Something Else",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [details, setDetails] = useState("");

  const message = useMemo(() => {
    const lines = [
      `Hi Profound Productions, I'd like a quote.`,
      ``,
      `Name: ${name || "—"}`,
      `Business/Brand: ${business || "—"}`,
      `Project type: ${projectType}`,
      `Details: ${details || "—"}`,
    ];
    return lines.join("\n");
  }, [name, business, projectType, details]);

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const isReady = name.trim().length > 0;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        window.open(waLink, "_blank", "noopener,noreferrer");
      }}
    >
      <Field label="Your name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Thabo Nkosi"
          className="field-input"
        />
      </Field>

      <Field label="Business / brand (optional)">
        <input
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          placeholder="e.g. Coco Bliss Snacks"
          className="field-input"
        />
      </Field>

      <Field label="Project type">
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => setProjectType(type)}
              className={`rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-200 active:scale-95 ${
                projectType === type
                  ? "border-accent bg-accent/10 text-accent scale-105"
                  : "border-surface-line text-neutral hover:border-paper/40 hover:text-paper hover:-translate-y-0.5"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </Field>

      <Field label="What do you need? (optional)">
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="e.g. A4 flyer for a weekend car wash promo, need it by Friday"
          rows={4}
          className="field-input resize-none"
        />
      </Field>

      <button
        type="submit"
        disabled={!isReady}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-6 py-4 font-mono text-sm uppercase tracking-wider text-canvas transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_14px_30px_-10px_rgba(222,192,146,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90"
      >
        <WhatsAppIcon />
        Send via WhatsApp
      </button>
      <p className="text-center font-mono text-xs text-neutral">
        Opens WhatsApp with your details pre-filled — you hit send.
      </p>

      <style jsx global>{`
        .field-input {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--surface-line);
          border-radius: 2px;
          padding: 0.75rem 1rem;
          color: var(--paper);
          font-family: var(--font-body);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder {
          color: var(--neutral);
        }
        .field-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(222, 192, 146, 0.15);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs uppercase tracking-wide text-neutral">
        {label}
      </span>
      {children}
    </label>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.84.5 3.56 1.36 5.03L2 22l5.25-1.38a9.84 9.84 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 17.93h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.37c0-4.53 3.69-8.22 8.24-8.22 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.2-8.23 8.2zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.24-.64.81-.78.97-.14.16-.29.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.39-1.73-.14-.24-.02-.38.11-.5.11-.12.25-.3.37-.45.13-.15.17-.25.25-.42.08-.16.04-.3-.04-.42-.08-.12-.5-1.2-.69-1.65-.18-.43-.37-.37-.5-.38h-.43c-.14 0-.37.05-.56.27-.2.21-.75.74-.75 1.8s.77 2.09.87 2.24c.11.14 1.5 2.3 3.65 3.13 1.82.7 2.19.56 2.59.52.4-.04 1.29-.52 1.47-1.03.18-.5.18-.93.13-1.02-.06-.1-.23-.16-.48-.28z" />
    </svg>
  );
}
