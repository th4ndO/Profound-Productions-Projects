/**
 * Time frame options for a goal, ported from reference/groundwork.html's
 * `TF` object (see the <script> block there). `days` is used to compute a
 * new goal's `due_at` at creation time: `created_at + days`.
 */
export type Timeframe = "day" | "week" | "month" | "quarter" | "year";

export const TIMEFRAMES: Timeframe[] = ["day", "week", "month", "quarter", "year"];

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  day: "A day",
  week: "A week",
  month: "A month",
  quarter: "3 months",
  year: "A year",
};

/**
 * Ported 1:1 from the prototype's `TF[*].days`:
 * `day:1, week:7, month:30, quarter:90, year:365`.
 */
export const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

export const DEFAULT_TIMEFRAME: Timeframe = "month";
