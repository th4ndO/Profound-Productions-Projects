import type { Category } from "@/lib/ideas";
import type { Timeframe } from "@/lib/timeframe";

/** /ideas URL for a filter combination; "all" leaves that param out. */
export function ideasHref(cat: Category | "all", tf: Timeframe | "all") {
  const params = new URLSearchParams();
  if (cat !== "all") params.set("cat", cat);
  if (tf !== "all") params.set("tf", tf);
  const qs = params.toString();
  return qs ? `/ideas?${qs}` : "/ideas";
}
