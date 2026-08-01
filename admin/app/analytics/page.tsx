import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import BarChart from "@/components/BarChart";
import UserBadge from "@/components/UserBadge";
import { fetchAnalytics } from "@/lib/data";

export const dynamic = "force-dynamic";

const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-2xl border border-stone-200 bg-white p-5">
    <p className="text-sm text-stone-500">{label}</p>
    <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
    {hint ? <p className="mt-0.5 text-xs text-stone-400">{hint}</p> : null}
  </div>
);

export default async function AnalyticsPage() {
  const a = await fetchAnalytics(30);
  const pct = (n: number, of: number) =>
    of > 0 ? `${Math.round((n / of) * 100)}%` : "—";
  const tierTotal = Math.max(
    1,
    a.tierDistribution.reduce((sum, t) => sum + t.count, 0)
  );

  return (
    <AdminShell active="analytics">
      <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-0.5 text-sm text-stone-500">Last 30 days</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Active members (7d)"
          value={String(a.activeLast7Days)}
          hint={`${pct(a.activeLast7Days, a.totalMembers)} of ${a.totalMembers} members signed in`}
        />
        <Stat
          label="Active members (30d)"
          value={String(a.activeLast30Days)}
          hint={`${pct(a.activeLast30Days, a.totalMembers)} of members`}
        />
        <Stat
          label="Reviewed in the last 30d"
          value={String(a.reviewedLast30Days)}
          hint={`${pct(a.reviewedLast30Days, a.totalMembers)} of members posted`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BarChart title="Signups" data={a.signupsByDay} color="bg-emerald-500 hover:bg-emerald-700" />
        <BarChart title="Reviews" data={a.reviewsByDay} />
        <BarChart title="Likes" data={a.likesByDay} color="bg-rose-400 hover:bg-rose-600" />
        <BarChart title="Comments" data={a.commentsByDay} color="bg-amber-400 hover:bg-amber-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Rank distribution</h2>
          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-stone-100">
            {a.tierDistribution.map((tier) =>
              tier.count > 0 ? (
                <div
                  key={tier.tier}
                  title={`${tier.tier}: ${tier.count}`}
                  style={{
                    width: `${(tier.count / tierTotal) * 100}%`,
                    backgroundColor: tier.color,
                  }}
                />
              ) : null
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {a.tierDistribution.map((tier) => (
              <li
                key={tier.tier}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  {tier.tier}
                </span>
                <span className="text-stone-500">
                  {tier.count} · {pct(tier.count, tierTotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Top reviewers</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {a.topReviewers.map((profile) => (
              <li key={profile.id}>
                <Link
                  href={`/users/${profile.id}`}
                  className="flex items-center justify-between py-2.5 transition hover:bg-stone-50"
                >
                  <UserBadge profile={profile} />
                  <span className="text-sm font-semibold text-stone-600">
                    {profile.review_count ?? 0}
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
