import { growth, growthArrow, growthClass } from "@/lib/kpi";

/**
 * A single figure inside a feature section, optionally carrying its
 * period-over-period change. Pass `previous` only when a comparison is
 * meaningful — point-in-time values like "active in the last 7 days" have no
 * previous-window equivalent here.
 */
export default function MetricTile({
  label,
  value,
  previous,
  hint,
  className = "",
}: {
  label: string;
  value: number | string;
  previous?: number;
  hint?: string;
  className?: string;
}) {
  const change =
    previous != null && typeof value === "number"
      ? growth(value, previous)
      : null;

  return (
    <div
      className={`rounded-lg border border-stone-200 bg-stone-50/60 p-4 ${className}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {change ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${growthClass(
              change.direction
            )}`}
          >
            {growthArrow(change.direction)} {change.label}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-0.5 text-xs text-stone-400">{hint}</p> : null}
      {change && previous != null ? (
        <p className="mt-0.5 text-xs text-stone-400">
          was {previous.toLocaleString()} last period
        </p>
      ) : null}
    </div>
  );
}
