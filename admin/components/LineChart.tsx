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

const W = 600;
const H = 160;
const PAD = { top: 10, right: 8, bottom: 4, left: 30 };

/**
 * Analytics-style daily line chart: gridlines, y-axis ticks, a smooth-ish
 * line over a gradient area, and a hoverable dot per day (SVG titles).
 * Server-rendered — no client JS.
 */
export default function LineChart({
  title,
  data,
  color = "#7c5ce0",
}: {
  title: string;
  data: DayCount[];
  color?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const rawMax = Math.max(...data.map((d) => d.count), 0);
  const max = Math.max(1, rawMax);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom - 14;

  const x = (i: number) =>
    PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (count: number) => PAD.top + innerH - (count / max) * innerH;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(data.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`;

  const ticks = max <= 4 ? max : 4;
  const gradientId = `lc-${title.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-stone-500">{total} total</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`${title}: ${total} across ${data.length} days`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {Array.from({ length: ticks + 1 }, (_, i) => {
          const value = Math.round((max / ticks) * i);
          const gy = y((max / ticks) * i);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={gy}
                y2={gy}
                stroke="#e7e5e4"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={gy + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#a8a29e"
              >
                {value}
              </text>
            </g>
          );
        })}

        {data.length > 0 && (
          <>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data.map((d, i) => (
              <circle
                key={d.day}
                cx={x(i)}
                cy={y(d.count)}
                r={data.length > 45 ? 2 : 3}
                fill="#ffffff"
                stroke={color}
                strokeWidth="1.5"
                className="opacity-0 transition-opacity hover:opacity-100"
              >
                <title>{`${d.day}: ${d.count}`}</title>
              </circle>
            ))}
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-stone-400">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}
