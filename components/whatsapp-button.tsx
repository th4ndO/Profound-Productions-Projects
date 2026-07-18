const WHATSAPP_NUMBER = "27764469804";
const MESSAGE = "Hi Profound Productions, I'd like to know more.";

export default function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-canvas shadow-[0_10px_30px_-8px_rgba(222,192,146,0.6)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_36px_-8px_rgba(222,192,146,0.7)] active:scale-95 md:bottom-8 md:right-8"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-accent opacity-30" />
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.84.5 3.56 1.36 5.03L2 22l5.25-1.38a9.84 9.84 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 17.93h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.37c0-4.53 3.69-8.22 8.24-8.22 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.2-8.23 8.2zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.24-.64.81-.78.97-.14.16-.29.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.39-1.73-.14-.24-.02-.38.11-.5.11-.12.25-.3.37-.45.13-.15.17-.25.25-.42.08-.16.04-.3-.04-.42-.08-.12-.5-1.2-.69-1.65-.18-.43-.37-.37-.5-.38h-.43c-.14 0-.37.05-.56.27-.2.21-.75.74-.75 1.8s.77 2.09.87 2.24c.11.14 1.5 2.3 3.65 3.13 1.82.7 2.19.56 2.59.52.4-.04 1.29-.52 1.47-1.03.18-.5.18-.93.13-1.02-.06-.1-.23-.16-.48-.28z" />
    </svg>
  );
}
