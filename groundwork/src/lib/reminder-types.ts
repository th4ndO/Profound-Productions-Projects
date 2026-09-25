/**
 * A goal's reminder schedule (supabase table `reminder_rules`). One rule
 * per goal — editing the day/time picker updates this same row rather than
 * creating a second one, so "remind me" stays a single on/off + schedule
 * per goal instead of a list.
 *
 * `days_of_week` uses JS `Date#getDay()` convention: 0 = Sunday .. 6 =
 * Saturday (matches what `send-reminders`, the Postgres function backing
 * it, and the day-picker UI all agree on).
 */
export interface ReminderRule {
  id: string;
  days_of_week: number[];
  local_time: string; // "HH:MM" or "HH:MM:SS", from Postgres `time`
  timezone: string;
  enabled: boolean;
}
