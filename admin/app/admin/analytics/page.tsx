import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AnalyticsNav from "@/components/AnalyticsNav";
import FeatureSection, { BreakdownList } from "@/components/FeatureSection";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import RangePicker from "@/components/RangePicker";
import UserBadge from "@/components/UserBadge";
import { fetchAnalytics } from "@/lib/data";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "membership", label: "Membership" },
  { id: "reviews", label: "Reviews" },
  { id: "engagement", label: "Engagement" },
  { id: "sharing", label: "Sharing & referral" },
];

/**
 * Analytics is organised by product area rather than by chart type: each
 * feature states how it performed this period, how that compares with last
 * period, and its daily history. Headline totals live on the Dashboard.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);
  const a = await fetchAnalytics(range);

  const pct = (n: number, of: number) =>
    of > 0 ? `${Math.round((n / of) * 100)}%` : "—";
  const totalLikes = a.likesByDay.reduce((sum, d) => sum + d.count, 0);
  const totalComments = a.commentsByDay.reduce((sum, d) => sum + d.count, 0);
  const totalReviews = a.reviewsByDay.reduce((sum, d) => sum + d.count, 0);

  return (
    <AdminShell active="analytics">
      <div className="px-8 pb-32 pt-6 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
        <AnalyticsNav sections={SECTIONS} />
        <div>
          <div className="sticky top-0 z-20 mb-6 border-b border-stone-200 bg-stone-50/95 py-3 backdrop-blur">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Core workspace
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">
                  Analytics
                </h1>
              </div>
              <RangePicker path="/admin/analytics" range={range} />
            </div>
          </div>

          <FeatureSection
            id="membership"
            link={{ href: "/admin/users", label: "All members" }}
            title="Membership"
            description="Signups and how many members are actually coming back."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="New signups"
                value={a.signupsInRange}
                previous={a.previous.signups}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Active (7d)"
                value={a.activeLast7Days}
                hint={`${pct(a.activeLast7Days, a.totalMembers)} of ${a.totalMembers} members`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Active (30d)"
                value={a.activeLast30Days}
                hint={`${pct(a.activeLast30Days, a.totalMembers)} of members`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Posted a review"
                value={a.reviewedInRange}
                hint={`${pct(a.reviewedInRange, a.totalMembers)} of members, in range`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
            </div>
            <LineChart
              title="Signups"
              data={a.signupsByDay}
              color="#059669"
              unit="signups"
            />
          </FeatureSection>

          <FeatureSection
            id="reviews"
            link={{ href: "/admin/reviews", label: "All reviews" }}
            title="Reviews"
            description="The core loop — Martinis rated, and which members are rating them."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="Reviews posted"
                value={totalReviews}
                previous={a.previous.reviews}
                className="col-span-12 md:col-span-6 xl:col-span-4"
              />
              <MetricTile
                label="Distinct members"
                value={a.reviewedInRange}
                hint="members who posted at least once"
                className="col-span-12 md:col-span-6 xl:col-span-4"
              />
              <MetricTile
                label="Reviews per member"
                value={
                  a.reviewedInRange > 0
                    ? (totalReviews / a.reviewedInRange).toFixed(1)
                    : "—"
                }
                className="col-span-12 md:col-span-6 xl:col-span-4"
              />
            </div>
            <LineChart title="Reviews" data={a.reviewsByDay} unit="reviews" />
          </FeatureSection>

          <FeatureSection
            id="engagement"
            link={{ href: "/admin/reviews", label: "All reviews" }}
            title="Engagement"
            description="Likes and comments on reviews — whether the feed is social or silent."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="Likes"
                value={totalLikes}
                previous={a.previous.likes}
                className="col-span-12 md:col-span-6 xl:col-span-4"
              />
              <MetricTile
                label="Comments"
                value={totalComments}
                previous={a.previous.comments}
                className="col-span-12 md:col-span-6 xl:col-span-4"
              />
              <MetricTile
                label="Interactions per review"
                value={
                  totalReviews > 0
                    ? ((totalLikes + totalComments) / totalReviews).toFixed(1)
                    : "—"
                }
                hint="likes + comments ÷ reviews in range"
                className="col-span-12 md:col-span-6 xl:col-span-4"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
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
          </FeatureSection>

          <FeatureSection
            id="sharing"
            link={{ href: "/admin/share-preview", label: "Share preview" }}
            title="Sharing & referral"
            description="The growth loops: review shares and invites."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="Review shares"
                value={a.totalShares}
                previous={a.previous.shares}
                className="col-span-12 md:col-span-6"
              />
              <MetricTile
                label="Invites"
                value={a.totalInvites}
                previous={a.previous.invites}
                className="col-span-12 md:col-span-6"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <LineChart
                title="Review shares"
                data={a.sharesByDay}
                color="#7c3aed"
                unit="shares"
              />
              <LineChart
                title="Invites"
                data={a.invitesByDay}
                color="#db2777"
                unit="invites"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <BreakdownList
                title="Review share channels"
                rows={a.shareChannels.map((channel) => ({
                  key: channel.channel,
                  label: channel.channel,
                  value: String(channel.count),
                }))}
                empty="No shares in this range."
              />
              <BreakdownList
                title="Invite channels"
                rows={a.inviteChannels.map((channel) => ({
                  key: channel.channel,
                  label: channel.channel,
                  value: String(channel.count),
                }))}
                empty="No invites in this range."
              />
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="font-semibold">Top sharers</h3>
              <ul className="mt-3 divide-y divide-stone-100">
                {a.topSharers.map((profile) => (
                  <li key={profile.id}>
                    <Link
                      href={`/admin/users/${profile.id}`}
                      className="flex items-center justify-between py-2.5 transition hover:bg-stone-50"
                    >
                      <UserBadge profile={profile} />
                      <span className="text-right text-sm">
                        <span className="block font-semibold text-stone-600">
                          {profile.share_count}
                        </span>
                        <span className="text-xs text-stone-400">
                          {new Date(
                            profile.last_shared_at
                          ).toLocaleDateString()}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {a.topSharers.length === 0 && (
                  <li className="py-2.5 text-sm text-stone-400">
                    No members have shared in this range.
                  </li>
                )}
              </ul>
            </div>
          </FeatureSection>

        </div>
      </div>
    </AdminShell>
  );
}
