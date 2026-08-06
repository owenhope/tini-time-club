import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { PageHeader } from "@/components/AdminPrimitives";
import AnalyticsNav from "@/components/AnalyticsNav";
import FeatureSection, { BreakdownList } from "@/components/FeatureSection";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import RangePicker from "@/components/RangePicker";
import UserBadge from "@/components/UserBadge";
import { fetchAnalytics, fetchNotificationAnalytics } from "@/lib/data";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "membership", label: "Membership" },
  { id: "reviews", label: "Reviews" },
  { id: "engagement", label: "Engagement" },
  { id: "sharing", label: "Sharing & referral" },
  { id: "ranking", label: "Ranking" },
  { id: "notifications", label: "Notifications" },
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
  const [a, n] = await Promise.all([
    fetchAnalytics(range),
    fetchNotificationAnalytics(30),
  ]);

  const pct = (n: number, of: number) =>
    of > 0 ? `${Math.round((n / of) * 100)}%` : "—";
  const tierTotal = Math.max(
    1,
    a.tierDistribution.reduce((sum, tier) => sum + tier.count, 0)
  );
  const totalLikes = a.likesByDay.reduce((sum, d) => sum + d.count, 0);
  const totalComments = a.commentsByDay.reduce((sum, d) => sum + d.count, 0);
  const totalReviews = a.reviewsByDay.reduce((sum, d) => sum + d.count, 0);

  return (
    <AdminShell active="analytics">
      <PageHeader
        eyebrow="Secondary tool"
        title="Analytics"
        description={`Every feature, how it moved in ${range.label.toLowerCase()}, and its history. Growth compares with the previous ${range.days} days.`}
        stats={[
          { label: "Total members", value: a.totalMembers, tone: "green" },
          { label: "Reviews in range", value: totalReviews, tone: "purple" },
          {
            label: "Shares in range",
            value: a.totalShares,
            tone: "chartreuse",
          },
          { label: "Window", value: range.label, tone: "muted" },
        ]}
        surface="transparent"
        density="compact"
        filters={<RangePicker path="/admin/analytics" range={range} />}
      />

      <div className="px-8 py-6 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
        <AnalyticsNav sections={SECTIONS} />
        <div>
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
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="font-semibold">Top members</h3>
              <ul className="mt-3 divide-y divide-stone-100">
                {a.topReviewers.map((profile) => (
                  <li key={profile.id}>
                    <Link
                      href={`/admin/users/${profile.id}`}
                      className="flex items-center justify-between py-2.5 transition hover:bg-stone-50"
                    >
                      <UserBadge profile={profile} />
                      <span className="text-sm font-semibold text-stone-600">
                        {profile.review_count ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
                {a.topReviewers.length === 0 && (
                  <li className="py-2.5 text-sm text-stone-400">
                    No members yet.
                  </li>
                )}
              </ul>
            </div>
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

          <FeatureSection
            id="ranking"
            link={{ href: "/admin/users", label: "All members" }}
            title="Ranking"
            description="How members are distributed across the four avatar-ring tiers, and the review count each tier takes."
          >
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <div className="flex h-4 overflow-hidden rounded-full bg-stone-100">
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
              <ul className="mt-4 divide-y divide-stone-100">
                {a.tierDistribution.map((tier) => (
                  <li
                    key={tier.tier}
                    className="flex items-baseline justify-between gap-4 py-2.5 text-sm"
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span
                        className="h-3 w-3 shrink-0 translate-y-0.5 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      />
                      <span className="font-medium">{tier.tier}</span>
                      <span className="text-stone-400">
                        {tier.max == null
                          ? `${tier.min}+ reviews`
                          : `${tier.min}–${tier.max} reviews`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="text-stone-500">
                        {tier.count} · {pct(tier.count, tierTotal)}
                      </span>
                      <span className="block text-xs text-stone-400">
                        {tier.next
                          ? `${tier.next.tier} at ${tier.next.min}`
                          : "Top tier"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </FeatureSection>

          <FeatureSection
            id="notifications"
            title="Notifications"
            link={{ href: "/admin/notifications", label: "Notifications" }}
            description="Push delivery, open rates, and open-to-review conversion (last 30 days)."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="Sent"
                value={n.totalSent}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Opened"
                value={n.totalOpened}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Open rate"
                value={
                  n.totalSent > 0
                    ? `${Math.round((n.totalOpened / n.totalSent) * 100)}%`
                    : "—"
                }
                hint="opened ÷ sent"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Open → review"
                value={
                  n.openToReviewRate == null
                    ? "—"
                    : `${Math.round(n.openToReviewRate * 100)}%`
                }
                hint="reviewed within 24h of an open"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
            </div>
          </FeatureSection>
        </div>
      </div>
    </AdminShell>
  );
}
