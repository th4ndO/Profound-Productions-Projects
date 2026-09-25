"use client";

import { useState, useTransition } from "react";
import type { ReminderRule } from "@/lib/reminder-types";
import { pushSupported, subscribeThisDevice, toSubscriptionInput } from "@/lib/push-client";
import { subscribeToPush } from "../../push-actions";
import { deleteReminderRule, setReminderEnabled, upsertReminderRule } from "../reminder-actions";
import styles from "./goal-detail.module.css";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // 0=Sun..6=Sat, matches days_of_week

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Johannesburg";
  } catch {
    return "Africa/Johannesburg";
  }
}

/** "HH:MM:SS" or "HH:MM" (from Postgres `time`) -> "HH:MM" for <input type="time">. */
function toInputTime(value: string): string {
  return value.slice(0, 5);
}

export function ReminderSettings({
  goalId,
  initialRule,
}: {
  goalId: string;
  initialRule: ReminderRule | null;
}) {
  const [rule, setRule] = useState(initialRule);
  const [days, setDays] = useState<number[]>(initialRule?.days_of_week ?? [1, 3, 5]);
  const [time, setTime] = useState(initialRule ? toInputTime(initialRule.local_time) : "19:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const supported = pushSupported();

  function toggleDay(day: number) {
    setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day].sort()));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        // Ask for notification permission / register the subscription
        // first — a saved rule with nowhere to send is silently useless,
        // so make sure this device can actually receive one before
        // writing the schedule.
        const subscription = await subscribeThisDevice();
        await subscribeToPush(toSubscriptionInput(subscription), navigator.userAgent);
        const saved = await upsertReminderRule(goalId, days, time, defaultTimezone());
        setRule(saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not turn on reminders.");
      }
    });
  }

  function handleToggleEnabled() {
    if (!rule) return;
    setError(null);
    const nextEnabled = !rule.enabled;
    setRule({ ...rule, enabled: nextEnabled });
    startTransition(async () => {
      try {
        await setReminderEnabled(goalId, rule.id, nextEnabled);
      } catch (err) {
        setRule(rule);
        setError(err instanceof Error ? err.message : "Could not update that reminder.");
      }
    });
  }

  function handleRemove() {
    if (!rule) return;
    setError(null);
    const removed = rule;
    setRule(null);
    startTransition(async () => {
      try {
        await deleteReminderRule(goalId, removed.id);
      } catch (err) {
        setRule(removed);
        setError(err instanceof Error ? err.message : "Could not remove that reminder.");
      }
    });
  }

  if (!supported) return null;

  return (
    <div className={styles.reminders}>
      <h2 className={styles.sectionLabel}>Reminders</h2>

      {rule ? (
        <div className={styles.reminderRow}>
          <span className={styles.meta}>
            {rule.enabled ? "On" : "Off"} · {DAY_LABELS.filter((_, i) => rule.days_of_week.includes(i)).join(" ")}{" "}
            at {toInputTime(rule.local_time)}
          </span>
          <button type="button" className={styles.link} onClick={handleToggleEnabled} disabled={pending}>
            {rule.enabled ? "Turn off" : "Turn on"}
          </button>
          <button type="button" className={styles.link} onClick={handleRemove} disabled={pending}>
            Remove
          </button>
        </div>
      ) : (
        <p className={styles.meta}>Get a nudge on the days you pick.</p>
      )}

      <div className={styles.reminderPicker}>
        <div className={styles.days} role="group" aria-label="Days to remind you">
          {DAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              className={styles.chip}
              aria-pressed={days.includes(day)}
              aria-label={
                ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]
              }
              onClick={() => toggleDay(day)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="Reminder time"
        />
        <button type="button" onClick={handleSave} disabled={pending || days.length === 0}>
          {rule ? "Save" : "Remind me"}
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
