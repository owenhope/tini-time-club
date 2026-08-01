export interface DayCount {
  day: string;
  count: number;
}

/** Zero-filled last-N-days buckets, ready for BarChart. */
export const bucketByDay = (
  timestamps: (string | null | undefined)[],
  days: number
): DayCount[] => {
  const byDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const ts of timestamps) {
    if (!ts) continue;
    const day = String(ts).slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([day, count]) => ({ day, count }));
};

export default function BarChart({
  title,
  data,
  color = "bg-violet-400 hover:bg-violet-600",
}: {
  title: string;
  data: DayCount[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-stone-500">{total} total</span>
      </div>
      <div className="mt-4 flex h-28 items-end gap-1">
        {data.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.count}`}
            className={`flex-1 rounded-t transition ${color}`}
            style={{
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count > 0 ? 4 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-stone-400">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}
