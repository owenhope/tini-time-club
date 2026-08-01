import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import LineChart from "@/components/LineChart";
import RangePicker from "@/components/RangePicker";
import UserBadge from "@/components/UserBadge";
import { fetchAnalytics } from "@/lib/data";
import { parseRange } from "@/lib/range";

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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const a = await fetchAnalytics(range);
  const pct = (n: number, of: number) =>
    of > 0 ? `${Math.round((n / of) * 100)}%` : "—";
  const tierTotal = Math.max(
    1,
    a.tierDistribution.reduce((sum, t) => sum + t.count, 0)
  );

  return (
    <AdminShell active="analytics">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-0.5 text-sm text-stone-500">{range.label}</p>
        </div>
        <RangePicker path="/analytics" range={range} />
      </div>

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
          label="Reviewed in range"
          value={String(a.reviewedInRange)}
          hint={`${pct(a.reviewedInRange, a.totalMembers)} of members posted`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <LineChart
          title="Signups"
          data={a.signupsByDay}
          color="#059669"
          unit="signups"
        />
        <LineChart title="Reviews" data={a.reviewsByDay} unit="reviews" />
        <LineChart
          title="Likes"
          data={a.likesByDay}
          color="#e11d48"
          unit="likes"
        />
        <LineChart
          title="Comments"
          data={a.commentsByDay}
          color="#d97706"
          unit="comments"
        />
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
