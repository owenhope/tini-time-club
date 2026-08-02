import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import KpiCard from "@/components/KpiCard";
import RangePicker from "@/components/RangePicker";
import { fetchDashboardKpis } from "@/lib/data";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

/**
 * A snapshot of the three numbers that say whether the club is growing:
 * members, reviews, locations. Everything else — per-feature breakdowns and
 * history — lives in Analytics.
 */
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const kpis = await fetchDashboardKpis(range);

  return (
    <AdminShell active="dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-stone-500">{range.label}</p>
        </div>
        <RangePicker path="/admin" range={range} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <KpiCard
          label="Members"
          metric={kpis.users}
          newLabel="new members"
          href="/admin/users"
          color="#059669"
          rangeLabel={range.label}
        />
        <KpiCard
          label="Reviews"
          metric={kpis.reviews}
          newLabel="new reviews"
          href="/admin/reviews"
          color="#7c5ce0"
          rangeLabel={range.label}
        />
        <KpiCard
          label="Locations"
          metric={kpis.locations}
          newLabel="new locations"
          href="/admin/locations"
          color="#d97706"
          rangeLabel={range.label}
        />
      </div>

      <p className="mt-6 text-sm text-stone-500">
        Want the per-feature breakdown and history?{" "}
        <Link
          href={`/admin/analytics?${range.query}`}
          className="font-semibold text-violet-600 hover:text-violet-800"
        >
          Open Analytics →
        </Link>
      </p>
    </AdminShell>
  );
}
