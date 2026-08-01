import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import LineChart from "@/components/LineChart";
import RangePicker from "@/components/RangePicker";
import UserBadge from "@/components/UserBadge";
import { fetchDashboardStats, fetchTopReviewers } from "@/lib/data";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-stone-200 bg-white p-5">
    <p className="text-sm text-stone-500">{label}</p>
    <p className="mt-1 text-3xl font-bold tracking-tight">
      {value.toLocaleString()}
    </p>
  </div>
);

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const [stats, topReviewers] = await Promise.all([
    fetchDashboardStats(range),
    fetchTopReviewers(5),
  ]);

  return (
    <AdminShell active="dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <RangePicker path="/" range={range} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Members" value={stats.totalUsers} />
        <Stat label="Reviews" value={stats.totalReviews} />
        <Stat label="Locations" value={stats.totalLocations} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <LineChart
          title={`Reviews — ${range.label}`}
          data={stats.reviewsByDay}
          unit="reviews"
        />

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Top locations</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {stats.topLocations.map((location, index) => (
              <li
                key={location.id}
                className="flex items-center justify-between py-2.5"
              >
                <span className="flex items-center gap-3">
                  <span className="w-5 text-sm text-stone-400">
                    {index + 1}
                  </span>
                  <span className="font-medium">{location.name}</span>
                </span>
                <span className="text-sm text-stone-500">
                  ★ {Number(location.rating).toFixed(1)} ·{" "}
                  {location.total_ratings} reviews
                </span>
              </li>
            ))}
            {stats.topLocations.length === 0 && (
              <li className="py-2.5 text-sm text-stone-400">
                No rated locations yet.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Newest members</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {stats.newestUsers.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/users/${user.id}`}
                  className="flex items-center justify-between py-2.5 transition hover:bg-stone-50"
                >
                  <UserBadge profile={user} />
                  <span className="text-sm text-stone-500">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Top reviewers</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {topReviewers.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/users/${user.id}`}
                  className="flex items-center justify-between py-2.5 transition hover:bg-stone-50"
                >
                  <UserBadge profile={user} />
                  <span className="text-sm font-semibold text-stone-600">
                    {user.review_count ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
