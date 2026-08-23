import Link from "next/link";
import { Panel } from "@/components/AdminPrimitives";

type HealthItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

type ApplicationHealth = {
  status: "positive" | "mixed" | "attention";
  headline: string;
  summary: string;
  wins: HealthItem[];
  losses: HealthItem[];
  watch: HealthItem[];
};

const statusStyle = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-950",
  mixed: "border-amber-200 bg-amber-50 text-amber-950",
  attention: "border-rose-200 bg-rose-50 text-rose-950",
};

const columns = [
  {
    key: "wins",
    label: "Wins",
    marker: "↑",
    markerClass: "bg-emerald-100 text-emerald-800",
    empty: "No clear wins in this period yet.",
  },
  {
    key: "losses",
    label: "Losses",
    marker: "↓",
    markerClass: "bg-rose-100 text-rose-800",
    empty: "No period-over-period losses.",
  },
  {
    key: "watch",
    label: "What to watch",
    marker: "!",
    markerClass: "bg-amber-100 text-amber-800",
    empty: "Nothing needs watching right now.",
  },
] as const;

export default function ApplicationHealthSummary({
  health,
}: {
  health: ApplicationHealth;
}) {
  return (
    <Panel title="How the application is going">
      <div
        className={`m-4 rounded-lg border px-4 py-3 ${statusStyle[health.status]}`}
      >
        <p className="font-bold">{health.headline}</p>
        <p className="mt-0.5 text-sm opacity-75">{health.summary}</p>
      </div>
      <div className="grid border-t border-stone-100 lg:grid-cols-3 lg:divide-x lg:divide-stone-100">
        {columns.map((column) => {
          const items = health[column.key];
          return (
            <section key={column.key} className="p-4">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                {column.label}
              </h2>
              <ul className="mt-2 space-y-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex gap-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3 transition hover:border-stone-300 hover:bg-stone-100"
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${column.markerClass}`}
                      >
                        {column.marker}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-stone-800">
                          {item.title} →
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-stone-500">
                          {item.detail}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {items.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-stone-200 px-3 py-4 text-xs text-stone-400">
                    {column.empty}
                  </li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
