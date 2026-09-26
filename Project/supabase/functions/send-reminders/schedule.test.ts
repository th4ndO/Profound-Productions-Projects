import { describe, expect, it } from "vitest";
import { isDueNow, isQuietNow, localParts, parseHHMM, type ScheduleRule } from "./schedule";

// Africa/Johannesburg is UTC+2 with no DST, so UTC instants map simply.
const JHB = "Africa/Johannesburg";
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function rule(overrides: Partial<ScheduleRule> = {}): ScheduleRule {
  return {
    days_of_week: EVERY_DAY,
    local_time: "19:00:00",
    timezone: JHB,
    last_sent_at: null,
    ...overrides,
  };
}

describe("localParts", () => {
  it("converts to the zone's local day and time", () => {
    // Wed 2026-09-23 22:30 UTC = Thu 00:30 in Johannesburg.
    expect(localParts(JHB, new Date("2026-09-23T22:30:00Z"))).toEqual({
      dayOfWeek: 4,
      hour: 0,
      minute: 30,
    });
  });

  it("throws on an invalid timezone", () => {
    expect(() => localParts("Not/AZone", new Date())).toThrow(RangeError);
  });
});

describe("parseHHMM", () => {
  it("returns minutes since midnight", () => {
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("07:05")).toBe(425);
    expect(parseHHMM("23:59")).toBe(1439);
  });
});

describe("isDueNow", () => {
  it("fires on the exact scheduled minute", () => {
    // 17:00 UTC = 19:00 local.
    expect(isDueNow(rule(), new Date("2026-09-24T17:00:10Z"))).toBe(true);
  });

  it("fires anywhere within the 5-minute window after the scheduled time", () => {
    expect(isDueNow(rule({ local_time: "18:56" }), new Date("2026-09-24T17:00:00Z"))).toBe(true);
  });

  it("does not fire before the scheduled time or after the window", () => {
    expect(isDueNow(rule(), new Date("2026-09-24T16:59:00Z"))).toBe(false);
    expect(isDueNow(rule({ local_time: "18:55" }), new Date("2026-09-24T17:00:00Z"))).toBe(false);
  });

  it("only fires on selected days of the week", () => {
    // 2026-09-24 is a Thursday (4).
    const now = new Date("2026-09-24T17:00:00Z");
    expect(isDueNow(rule({ days_of_week: [4] }), now)).toBe(true);
    expect(isDueNow(rule({ days_of_week: [1, 2, 3, 5] }), now)).toBe(false);
  });

  it("catches a late-night rule whose window crosses midnight", () => {
    // Run at Fri 00:00 local (Thu 22:00 UTC); rule is Thursday 23:58.
    const now = new Date("2026-09-24T22:00:00Z");
    expect(isDueNow(rule({ local_time: "23:58", days_of_week: [4] }), now)).toBe(true);
    // ...and it's the scheduled day (Thursday) that counts, not the run's day.
    expect(isDueNow(rule({ local_time: "23:58", days_of_week: [5] }), now)).toBe(false);
  });

  it("does not re-send an occurrence that already went out", () => {
    const now = new Date("2026-09-24T17:03:00Z");
    const sentThisOccurrence = "2026-09-24T17:00:05Z";
    expect(isDueNow(rule({ last_sent_at: sentThisOccurrence }), now)).toBe(false);
  });

  it("sends again the next day", () => {
    const now = new Date("2026-09-25T17:00:00Z");
    expect(isDueNow(rule({ last_sent_at: "2026-09-24T17:00:05Z" }), now)).toBe(true);
  });

  it("does not suppress a late-night rule whose last send was stamped after midnight", () => {
    // Thursday's 23:58 went out at Fri 00:00 local; Friday's 23:58 must still fire.
    const now = new Date("2026-09-25T22:00:00Z"); // Sat 00:00 local
    const r = rule({ local_time: "23:58", last_sent_at: "2026-09-24T22:00:05Z" });
    expect(isDueNow(r, now)).toBe(true);
  });

  it("evaluates the time in the rule's own timezone across DST", () => {
    // New York is UTC-4 in September (EDT), UTC-5 in December (EST).
    const ny = rule({ timezone: "America/New_York", local_time: "08:00" });
    expect(isDueNow(ny, new Date("2026-09-24T12:00:00Z"))).toBe(true);
    expect(isDueNow(ny, new Date("2026-12-10T13:00:00Z"))).toBe(true);
    expect(isDueNow(ny, new Date("2026-12-10T12:00:00Z"))).toBe(false);
  });
});

describe("isQuietNow", () => {
  it("handles a window that wraps midnight", () => {
    // 21:30 -> 07:00 local.
    expect(isQuietNow("21:30", "07:00", JHB, new Date("2026-09-24T20:00:00Z"))).toBe(true); // 22:00
    expect(isQuietNow("21:30", "07:00", JHB, new Date("2026-09-24T03:00:00Z"))).toBe(true); // 05:00
    expect(isQuietNow("21:30", "07:00", JHB, new Date("2026-09-24T05:00:00Z"))).toBe(false); // 07:00
    expect(isQuietNow("21:30", "07:00", JHB, new Date("2026-09-24T17:00:00Z"))).toBe(false); // 19:00
  });

  it("handles a same-day window", () => {
    expect(isQuietNow("12:00:00", "14:00:00", JHB, new Date("2026-09-24T11:00:00Z"))).toBe(true); // 13:00
    expect(isQuietNow("12:00:00", "14:00:00", JHB, new Date("2026-09-24T12:00:00Z"))).toBe(false); // 14:00
  });

  it("treats equal start and end as no quiet hours", () => {
    expect(isQuietNow("22:00", "22:00", JHB, new Date("2026-09-24T20:00:00Z"))).toBe(false);
  });
});
