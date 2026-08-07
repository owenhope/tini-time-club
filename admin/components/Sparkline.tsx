import type { DayCount } from "@/lib/bucket";

const W = 280;
const H = 44;

/**
 * Axis-free trend line for a KPI card. The shape carries the story; the exact
 * numbers live in the card's own figures, so there are no ticks or tooltips.
 */
export default function Sparkline({
  data,
  color = "#7c5ce0",
}: {
  data: DayCount[];
  color?: string;
}) {
  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.count));
  const x = (i: number) =>
    data.length > 1 ? (i / (data.length - 1)) * W : W / 2;
  const y = (count: number) => H - 2 - (count / max) * (H - 4);

  const line = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const gradientId = `spark-${color.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
