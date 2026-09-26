// Pure scheduling logic for send-reminders — no Deno, Supabase, or network
// dependencies, so it can be unit-tested with Vitest (schedule.test.ts)
// as well as imported by the Edge Function.

export const WINDOW_MINUTES = 5;

const MINUTE_MS = 60 * 1000;

export interface LocalParts {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday, matches reminder_rules.days_of_week
  hour: number;
  minute: number;
}

/** Throws a RangeError if `timezone` isn't a valid IANA zone. */
export function localParts(timezone: string, date: Date): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    dayOfWeek: dayNames.indexOf(parts.weekday),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export interface ScheduleRule {
  days_of_week: number[];
  local_time: string; // "HH:MM" or "HH:MM:SS", from Postgres `time`
  timezone: string;
  last_sent_at: string | null;
}

/**
 * True if the rule's scheduled local time fell within the WINDOW_MINUTES
 * ending at `now` (inclusive of `now`'s minute) on one of its days, and
 * that occurrence hasn't already been sent.
 *
 * Each minute of the window is converted to local time on its own, rather
 * than comparing minutes-since-midnight once, so a window that crosses
 * local midnight still matches: a 23:58 rule is caught by the 00:00 run,
 * on the day it was scheduled for (not the day the run happened on).
 *
 * "Already sent" means last_sent_at is at or after the start of the
 * matched occurrence's minute — not "same local date", which would wrongly
 * suppress a 23:58 rule whose previous send was stamped just after
 * midnight.
 */
export function isDueNow(rule: ScheduleRule, now: Date): boolean {
  const ruleMinutes = parseHHMM(rule.local_time.slice(0, 5));

  for (let k = 0; k < WINDOW_MINUTES; k++) {
    const candidate = now.getTime() - k * MINUTE_MS;
    const local = localParts(rule.timezone, new Date(candidate));
    if (local.hour * 60 + local.minute !== ruleMinutes) continue;
    if (!rule.days_of_week.includes(local.dayOfWeek)) continue;

    const occurrenceStart = Math.floor(candidate / MINUTE_MS) * MINUTE_MS;
    if (rule.last_sent_at && new Date(rule.last_sent_at).getTime() >= occurrenceStart) {
      return false; // this occurrence already went out
    }
    return true;
  }
  return false;
}

export function isQuietNow(quietStart: string, quietEnd: string, timezone: string, now: Date): boolean {
  const local = localParts(timezone, now);
  const nowMinutes = local.hour * 60 + local.minute;
  const start = parseHHMM(quietStart.slice(0, 5));
  const end = parseHHMM(quietEnd.slice(0, 5));
  if (start === end) return false;
  if (start < end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end; // wraps midnight, e.g. 21:30 -> 07:00
}
