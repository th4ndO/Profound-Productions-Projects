"use client";

export default function WhatsAppButton({ sellerId, href }: { sellerId: string; href: string }) {
  function handleClick() {
    try {
      navigator.sendBeacon(
        "/api/events",
        new Blob([JSON.stringify({ sellerId, eventType: "whatsapp_click" })], {
          type: "application/json",
        }),
      );
    } catch {
      // Never block the redirect on a logging failure.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="mt-6 block w-full rounded-full bg-green-700 py-3 text-center font-semibold text-white transition hover:bg-green-800 active:scale-95"
    >
      Message on WhatsApp
    </a>
  );
}
