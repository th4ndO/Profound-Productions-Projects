"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getExistingSubscription,
  pushSupported,
  subscribeThisDevice,
  toSubscriptionInput,
} from "@/lib/push-client";
import { subscribeToPush, unsubscribeFromPush } from "../push-actions";
import { updateProfile } from "./actions";
import styles from "./settings.module.css";

function timezoneOptions(): string[] {
  try {
    const values = Intl.supportedValuesOf?.("timeZone") ?? [];
    if (values.length) return values;
  } catch {
    // fall through to the small fallback list below
  }
  return [
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Australia/Sydney",
    "UTC",
  ];
}

export function SettingsForm({
  timezone,
  quietStart,
  quietEnd,
  deviceCount,
}: {
  timezone: string;
  quietStart: string;
  quietEnd: string;
  deviceCount: number;
}) {
  const [tz, setTz] = useState(timezone);
  const [start, setStart] = useState(quietStart);
  const [end, setEnd] = useState(quietEnd);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // pushSupported() is a synchronous, stable-per-session browser feature
  // check, so it's safe as a lazy initial value; only the async
  // subscription lookup below needs the effect.
  const [thisDeviceOn, setThisDeviceOn] = useState<boolean | null>(() =>
    pushSupported() ? null : false,
  );
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!pushSupported()) return;
    getExistingSubscription().then((sub) => setThisDeviceOn(sub !== null));
  }, []);

  function handleSaveProfile() {
    setProfileError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateProfile(tz, start, end);
        setSaved(true);
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Could not save settings.");
      }
    });
  }

  function handleEnableDevice() {
    setDeviceError(null);
    startTransition(async () => {
      try {
        const subscription = await subscribeThisDevice();
        await subscribeToPush(toSubscriptionInput(subscription), navigator.userAgent);
        setThisDeviceOn(true);
      } catch (err) {
        setDeviceError(err instanceof Error ? err.message : "Could not enable notifications.");
      }
    });
  }

  function handleDisableDevice() {
    setDeviceError(null);
    startTransition(async () => {
      try {
        const subscription = await getExistingSubscription();
        if (subscription) {
          await unsubscribeFromPush(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setThisDeviceOn(false);
      } catch (err) {
        setDeviceError(err instanceof Error ? err.message : "Could not disable notifications.");
      }
    });
  }

  return (
    <div className={styles.sections}>
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Notifications</h2>
        <p className={styles.meta}>
          {deviceCount === 0
            ? "No devices are set up for reminders yet."
            : `Reminders can reach ${deviceCount} device${deviceCount === 1 ? "" : "s"}.`}
        </p>
        {pushSupported() ? (
          thisDeviceOn === null ? null : thisDeviceOn ? (
            <button type="button" onClick={handleDisableDevice} disabled={pending}>
              Turn off notifications on this device
            </button>
          ) : (
            <button type="button" onClick={handleEnableDevice} disabled={pending}>
              Turn on notifications on this device
            </button>
          )
        ) : (
          <p className={styles.meta}>This browser doesn&apos;t support push notifications.</p>
        )}
        {deviceError && (
          <p className={styles.error} role="alert">
            {deviceError}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Quiet hours</h2>
        <p className={styles.meta}>Reminders won&apos;t be sent during this window.</p>

        <label className={styles.field}>
          Timezone
          <select value={tz} onChange={(e) => setTz(e.target.value)}>
            {timezoneOptions().map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.timeRow}>
          <label className={styles.field}>
            From
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className={styles.field}>
            To
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>

        <button type="button" onClick={handleSaveProfile} disabled={pending}>
          Save
        </button>
        {saved && <span className={styles.meta}> Saved.</span>}
        {profileError && (
          <p className={styles.error} role="alert">
            {profileError}
          </p>
        )}
      </section>
    </div>
  );
}
