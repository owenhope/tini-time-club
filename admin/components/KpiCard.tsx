import Link from "next/link";
import Sparkline from "@/components/Sparkline";
import type { KpiMetric } from "@/lib/data";
import { growth, growthArrow, growthClass } from "@/lib/kpi";

/**
 * One headline KPI: the all-time total, how many were added in the selected
 * window, and how that compares with the window before it.
 */
export default function KpiCard({
  label,
  metric,
  newLabel,
  href,
  color,
  rangeLabel,
}: {
  label: string;
  metric: KpiMetric;
  /** Noun for the in-range figure, e.g. "new members". */
  newLabel: string;
  href: string;
  color: string;
  rangeLabel: string;
}) {
  const change = growth(metric.current, metric.previous);

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-md"
    >
      <p className="text-sm text-stone-500 group-hover:text-violet-700">
        {label} →
      </p>
      <p className="mt-1 text-4xl font-bold tracking-tight">
        {metric.total.toLocaleString()}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-lg font-semibold tabular-nums">
          +{metric.current.toLocaleString()}
        </span>
        <span className="text-sm text-stone-500">{newLabel}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${growthClass(
            change.direction
          )}`}
        >
          {growthArrow(change.direction)} {change.label}
        </span>
      </div>

      <p className="mt-0.5 text-xs text-stone-400">
        {rangeLabel} vs previous · was {metric.previous.toLocaleString()}
      </p>

      <div className="mt-4">
        <Sparkline data={metric.byDay} color={color} />
      </div>
    </Link>
  );
}
