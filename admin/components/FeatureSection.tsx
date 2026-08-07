import Link from "next/link";

/** One product area on the Analytics page: what it is, how it's doing. */
export default function FeatureSection({
  id,
  title,
  description,
  link,
  children,
}: {
  /** Anchor target for the sub-nav. */
  id: string;
  title: string;
  description: string;
  /** Where to go to work with this feature's underlying rows. */
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    // scroll-mt keeps anchor jumps clear of the sticky Analytics toolbar.
    <section id={id} className="mt-8 scroll-mt-24 first:mt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-stone-500">{description}</p>
        </div>
        {link ? (
          <Link
            href={link.href}
            className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-bold text-stone-600 transition hover:bg-stone-100"
          >
            {link.label} →
          </Link>
        ) : null}
      </div>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

/** A labelled count list — share channels, celebration kinds, and friends. */
export function BreakdownList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { key: string; label: string; value: string; meta?: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 divide-y divide-stone-100">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span className="font-medium capitalize">{row.label}</span>
            <span className="text-right text-stone-500">
              <span className="block tabular-nums">{row.value}</span>
              {row.meta ? (
                <span className="text-xs text-stone-400">{row.meta}</span>
              ) : null}
            </span>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-2.5 text-sm text-stone-400">{empty}</li>
        )}
      </ul>
    </div>
  );
}
