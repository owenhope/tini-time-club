export interface DayCount {
  day: string;
  count: number;
}

/** Zero-filled daily buckets across [since, until], ready for LineChart. */
export const bucketByDay = (
  timestamps: (string | null | undefined)[],
  since: Date,
  until: Date
): DayCount[] => {
  const byDay = new Map<string, number>();
  const cursor = new Date(since);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= until) {
    byDay.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const ts of timestamps) {
    if (!ts) continue;
    const day = String(ts).slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([day, count]) => ({ day, count }));
};
