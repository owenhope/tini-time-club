import Link from "next/link";
import { PageHeader } from "@/components/AdminPrimitives";
import RangePicker from "@/components/RangePicker";
import type { DateRange } from "@/lib/range";

const SCREENS = [
  { href: "/admin/analytics", label: "Overview", key: "overview" },
  { href: "/admin/analytics/growth", label: "Growth", key: "growth" },
  { href: "/admin/analytics/engagement", label: "Engagement", key: "engagement" },
  { href: "/admin/analytics/content", label: "Content & places", key: "content" },
] as const;

export default function AnalyticsHeader({ active, range, title, description }: {
  active: (typeof SCREENS)[number]["key"];
  range: DateRange;
  title: string;
  description: string;
}) {
  const path = SCREENS.find((screen) => screen.key === active)?.href ?? SCREENS[0].href;
  return (
    <>
      <PageHeader eyebrow="Analytics" title={title} description={description} actions={<RangePicker path={path} range={range} />} density="compact" surface="transparent" />
      <nav className="border-y border-stone-200 bg-white px-8" aria-label="Analytics screens">
        <div className="flex gap-6 overflow-x-auto">
          {SCREENS.map((screen) => (
            <Link key={screen.key} href={`${screen.href}?${range.query}`} className={`whitespace-nowrap border-b-2 py-3 text-sm font-bold transition ${screen.key === active ? "border-violet-700 text-violet-800" : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-900"}`}>
              {screen.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
