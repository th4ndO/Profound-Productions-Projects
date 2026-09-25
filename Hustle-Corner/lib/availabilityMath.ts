// Pure date/slot math, zero imports -- deliberately kept free of any
// Supabase/Next.js dependency so it can be unit-tested directly (plain
// node/tsx) without a request context, and so it's obviously side-effect-free.

// Single-campus app (University of Pretoria, Hatfield) -- South Africa has
// one timezone with no DST, so this is hardcoded rather than built as a
// general per-seller timezone system.
export const SAST_OFFSET_HOURS = 2;
export const BOOKING_WINDOW_DAYS = 14;

export type AvailabilityRule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

export type OpenSlot = {
  startAt: string;
  endAt: string;
};

export function sastToUtc(year: number, month: number, day: number, hours: number, minutes: number): Date {
  const utcMillis = Date.UTC(year, month - 1, day, hours, minutes) - SAST_OFFSET_HOURS * 60 * 60 * 1000;
  return new Date(utcMillis);
}

export type SastDateParts = { year: number; month: number; day: number; dow: number };

export function sastDatePartsFor(instant: Date): SastDateParts {
  const sast = new Date(instant.getTime() + SAST_OFFSET_HOURS * 60 * 60 * 1000);
  return {
    year: sast.getUTCFullYear(),
    month: sast.getUTCMonth() + 1,
    day: sast.getUTCDate(),
    dow: sast.getUTCDay(),
  };
}

export function addDays(parts: SastDateParts, n: number): SastDateParts {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + n));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    dow: d.getUTCDay(),
  };
}

/** Open, bookable slots computed from recurring weekly rules minus any
 * already-taken start times, over the next BOOKING_WINDOW_DAYS days.
 * `now` is a parameter (not read internally) so this stays pure and
 * deterministic for testing. */
export function computeOpenSlots(
  rules: AvailabilityRule[],
  takenStartTimesMs: number[],
  now: Date,
): OpenSlot[] {
  if (rules.length === 0) return [];

  const takenTimes = new Set(takenStartTimesMs);
  const windowStart = sastDatePartsFor(now);

  const slots: OpenSlot[] = [];
  for (let dayOffset = 0; dayOffset < BOOKING_WINDOW_DAYS; dayOffset++) {
    const day = addDays(windowStart, dayOffset);
    const dayRules = rules.filter((r) => r.dayOfWeek === day.dow);

    for (const rule of dayRules) {
      const [startH, startM] = rule.startTime.split(":").map(Number);
      const [endH, endM] = rule.endTime.split(":").map(Number);
      const dayStartUtc = sastToUtc(day.year, day.month, day.day, startH, startM);
      const dayEndUtc = sastToUtc(day.year, day.month, day.day, endH, endM);

      for (
        let slotStart = dayStartUtc;
        slotStart.getTime() + rule.slotMinutes * 60_000 <= dayEndUtc.getTime();
        slotStart = new Date(slotStart.getTime() + rule.slotMinutes * 60_000)
      ) {
        if (slotStart.getTime() <= now.getTime()) continue;
        if (takenTimes.has(slotStart.getTime())) continue;
        const slotEnd = new Date(slotStart.getTime() + rule.slotMinutes * 60_000);
        slots.push({ startAt: slotStart.toISOString(), endAt: slotEnd.toISOString() });
      }
    }
  }

  slots.sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
  return slots;
}
