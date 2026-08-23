import type { DateRange } from "@/lib/range";

export interface DayCount {
  day: string;
  count: number;
}

export const rangeArgs = (range: DateRange) => ({
  p_since: range.since.toISOString().slice(0, 10),
  p_until: range.until.toISOString().slice(0, 10),
});
