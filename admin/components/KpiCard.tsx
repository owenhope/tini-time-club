import Link from "next/link";
import Sparkline from "@/components/Sparkline";
import type { KpiMetric } from "@/lib/data";
import { growth, growthArrow, growthClass } from "@/lib/kpi";

/** A selected-window KPI with previous-window comparison and daily history. */
export default function KpiCard({
  label,
  metric,
  newLabel,
  href,
  color,
  rangeLabel,
  className = "",
}: {
  label: string;
  metric: KpiMetric;
  /** Noun for the in-range figure, e.g. "new members". */
  newLabel: string;
  href: string;
  color: string;
  rangeLabel: string;
  className?: string;
}) {
  const change = growth(metric.current, metric.previous);

  return (
    <Link
      href={href}
      className={`group grid grid-cols-[minmax(0,0.85fr)_minmax(7rem,1fr)] items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-md ${className}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-stone-500 group-hover:text-violet-700">
          {label} →
        </p>
        <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">
          {metric.current.toLocaleString()}
        </p>

        <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
          <span>{rangeLabel}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${growthClass(
              change.direction
            )}`}
          >
            {growthArrow(change.direction)} {change.label}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-stone-400">
          Previous period: {metric.previous.toLocaleString()} {newLabel}
        </p>
      </div>

      <div className="h-14 min-w-0">
        <Sparkline data={metric.byDay} color={color} />
      </div>
    </Link>
  );
}
