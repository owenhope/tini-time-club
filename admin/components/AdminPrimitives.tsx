import Link from "next/link";

export type HeaderStat = {
  label: string;
  value: string | number;
  tone?: "green" | "purple" | "chartreuse" | "muted";
};

const statTone = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  purple: "border-violet-300 bg-violet-100 text-violet-800",
  chartreuse: "border-chartreuse-dark bg-chartreuse text-emerald-950",
  muted: "border-stone-200 bg-white text-stone-700",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  stats = [],
  statColumns = 4,
  surface = "default",
  density = "normal",
  actions,
  filters,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  stats?: HeaderStat[];
  statColumns?: 3 | 4;
  surface?: "default" | "transparent";
  density?: "normal" | "compact";
  actions?: React.ReactNode;
  filters?: React.ReactNode;
}) {
  const statColumnClass = statColumns === 3 ? "xl:col-span-4" : "xl:col-span-3";
  const surfaceClass =
    surface === "transparent"
      ? "border-b border-transparent bg-transparent"
      : "border-b border-stone-200 bg-white";
  const paddingClass = density === "compact" ? "px-8 pb-3 pt-6" : "px-8 py-6";

  return (
    <section className={surfaceClass}>
      <div className={`grid grid-cols-12 gap-4 ${paddingClass}`}>
        <div className="col-span-12 flex items-start justify-between gap-6">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-500">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>

        {stats.length > 0 ? (
          <div className="col-span-12 grid grid-cols-12 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`col-span-12 rounded-lg border px-4 py-3 md:col-span-6 ${statColumnClass} ${
                  statTone[stat.tone ?? "muted"]
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">
                  {stat.label}
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {filters ? <div className="col-span-12">{filters}</div> : null}
      </div>
    </section>
  );
}

export function FilterBar({
  action,
  searchName = "q",
  searchDefault,
  searchPlaceholder,
  children,
}: {
  action: string;
  searchName?: string;
  searchDefault?: string;
  searchPlaceholder: string;
  children?: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2"
    >
      <input
        type="search"
        name={searchName}
        defaultValue={searchDefault ?? ""}
        placeholder={searchPlaceholder}
        className="h-9 min-w-80 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
      />
      {children}
      <button
        type="submit"
        className="h-9 rounded-md bg-emerald-900 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
      >
        Apply
      </button>
    </form>
  );
}

export function FilterSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm font-medium normal-case tracking-normal text-stone-700 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DataTable({
  columns,
  children,
  empty,
}: {
  columns: React.ReactNode[];
  children: React.ReactNode;
  empty?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-100 text-[11px] uppercase tracking-[0.14em] text-stone-500">
          <tr>
            {columns.map((column, index) => (
              <th key={index} className="px-4 py-3 font-black">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-stone-100 px-5 py-10 text-center text-sm text-stone-400">
      {children}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "green" | "purple" | "red" | "muted";
}) {
  const classes = {
    green: "bg-emerald-50 text-emerald-950 ring-emerald-200",
    purple: "bg-violet-100 text-violet-800 ring-violet-300",
    red: "bg-red-50 text-red-700 ring-red-100",
    muted: "bg-stone-100 text-stone-600 ring-stone-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

export function ActionLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="inline-flex h-8 items-center rounded-md border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-violet-300 hover:text-violet-700"
    >
      {children}
    </Link>
  );
}

export function Panel({
  title,
  href,
  linkLabel,
  children,
  className = "",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-stone-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-black tracking-tight text-stone-900">
          {title}
        </h2>
        {href && linkLabel ? (
          <Link
            href={href}
            className="text-xs font-bold text-violet-700 hover:text-violet-800"
          >
            {linkLabel} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
