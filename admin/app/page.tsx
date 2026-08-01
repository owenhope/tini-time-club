import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import UserBadge from "@/components/UserBadge";
import { fetchDashboardStats } from "@/lib/data";

export const dynamic = "force-dynamic";

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-stone-200 bg-white p-5">
    <p className="text-sm text-stone-500">{label}</p>
    <p className="mt-1 text-3xl font-bold tracking-tight">
      {value.toLocaleString()}
    </p>
  </div>
);

const ReviewsChart = ({
  data,
}: {
  data: { day: string; count: number }[];
}) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Reviews — last 30 days</h2>
        <span className="text-sm text-stone-500">
          {data.reduce((sum, d) => sum + d.count, 0)} total
        </span>
      </div>
      <div className="mt-4 flex h-32 items-end gap-1">
        {data.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.count}`}
            className="flex-1 rounded-t bg-violet-400 transition hover:bg-violet-600"
            style={{
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count > 0 ? 4 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-stone-400">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
};

export default async function Dashboard() {
  const stats = await fetchDashboardStats();

  return (
    <AdminShell active="dashboard">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Members" value={stats.totalUsers} />
        <Stat label="Reviews" value={stats.totalReviews} />
        <Stat label="Locations" value={stats.totalLocations} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ReviewsChart data={stats.reviewsLast30Days} />

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

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
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
    </AdminShell>
  );
}
