import { VAPID_PUBLIC_KEY } from "@/lib/supabase/config";

/** Web Push wants the VAPID key as a raw ArrayBuffer, not the base64url string. */
function urlBase64ToArrayBuffer(base64Url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** The current subscription for this browser, if any (does not prompt). */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/**
 * Registers the service worker (idempotent) and subscribes this browser to
 * push, prompting for Notification permission if not already granted.
 * Throws if the user denies permission or the browser refuses to subscribe.
 */
export async function subscribeThisDevice(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error("This browser doesn't support push notifications.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY),
  });
}

/** Extracts the {endpoint, keys} shape the server needs to store and later send to. */
export function toSubscriptionInput(subscription: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("This browser returned an incomplete push subscription.");
  }
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}
