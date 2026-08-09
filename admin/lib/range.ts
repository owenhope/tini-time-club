export interface DateRange {
  since: Date;
  until: Date;
  /** Whole days covered, for bucketing. */
  days: number;
  label: string;
  /** Query-string fragment that reproduces this range. */
  query: string;
}

export const RANGE_PRESETS = [7, 30, 90] as const;

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};
const endOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
};

/**
 * Range from search params: `?from=YYYY-MM-DD&to=YYYY-MM-DD` for custom
 * ranges, `?days=N` for presets, defaulting to the last 30 days.
 */
export const parseRange = (params: {
  days?: string;
  from?: string;
  to?: string;
}): DateRange => {
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  if (isDate(params.from) && isDate(params.to)) {
    const since = startOfDay(new Date(`${params.from}T00:00:00Z`));
    const until = endOfDay(new Date(`${params.to}T00:00:00Z`));
    if (since <= until) {
      const days =
        Math.round(
          (startOfDay(until).getTime() - since.getTime()) / 86_400_000
        ) + 1;
      return {
        since,
        until,
        days,
        label: `${params.from} → ${params.to}`,
        query: `from=${params.from}&to=${params.to}`,
      };
    }
  }

  const days = RANGE_PRESETS.includes(Number(params.days) as 7 | 30 | 90)
    ? Number(params.days)
    : 30;
  const until = endOfDay(new Date());
  const since = startOfDay(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return {
    since,
    until,
    days,
    label: `Last ${days} days`,
    query: `days=${days}`,
  };
};
