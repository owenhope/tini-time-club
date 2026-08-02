/** Period-over-period growth, shared by the dashboard and analytics. */

export interface Growth {
  /** Percent change vs the previous window; null when there is no baseline. */
  pct: number | null;
  direction: "up" | "down" | "flat";
  /** Ready-to-render label, e.g. "+42%" or "New". */
  label: string;
}

export const growth = (current: number, previous: number): Growth => {
  if (previous === 0) {
    return current === 0
      ? { pct: null, direction: "flat", label: "No change" }
      : { pct: null, direction: "up", label: "New" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    pct,
    direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
    label: `${pct > 0 ? "+" : ""}${pct}%`,
  };
};

export const growthClass = (direction: Growth["direction"]): string =>
  direction === "up"
    ? "bg-emerald-100 text-emerald-800"
    : direction === "down"
      ? "bg-rose-100 text-rose-800"
      : "bg-stone-100 text-stone-500";

export const growthArrow = (direction: Growth["direction"]): string =>
  direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
