import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AnalyticsNav from "@/components/AnalyticsNav";
import {
  DataTable,
  EmptyState,
  StatusPill,
} from "@/components/AdminPrimitives";
import FeatureSection, { BreakdownList } from "@/components/FeatureSection";
import DonutChart from "@/components/DonutChart";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import RangePicker from "@/components/RangePicker";
import UserBadge from "@/components/UserBadge";
import { fetchAnalytics, fetchProductTelemetry } from "@/lib/data";
import { formatCityRegion } from "@/lib/format";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "membership", label: "Onboarding" },
  { id: "reviews", label: "Review milestones" },
  { id: "retention", label: "D7 retention" },
  { id: "auth-health", label: "Auth health" },
  { id: "versions", label: "App versions" },
  { id: "spirits-types", label: "Spirits & Types" },
  { id: "martini-index", label: "Martini Index" },
  { id: "places", label: "Places" },
  { id: "engagement", label: "Social actions" },
  { id: "sharing", label: "Sharing & referral" },
];

const REVIEW_SHARE_CHANNEL_LABELS: Record<string, string> = {
  instagram_story: "Instagram Story",
  instagram_post: "Instagram Post",
  share_link: "Share Link",
  sheet: "Share Sheet",
  email: "Email",
  instagram: "Instagram",
};

const reviewShareChannelLabel = (channel: string) =>
  REVIEW_SHARE_CHANNEL_LABELS[channel] ?? channel.replaceAll("_", " ");

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
  const [a, telemetry] = await Promise.all([
    fetchAnalytics(range),
    fetchProductTelemetry(range),
  ]);

  const pct = (n: number, of: number) =>
    of > 0 ? `${Math.round((n / of) * 100)}%` : "—";
  const totalLikes = a.likesByDay.reduce((sum, d) => sum + d.count, 0);
  const totalCommentLikes = a.commentLikesByDay.reduce(
    (sum, day) => sum + day.count,
    0
  );
  const totalComments = a.commentsByDay.reduce((sum, d) => sum + d.count, 0);
  const totalReviews = a.reviewsByDay.reduce((sum, d) => sum + d.count, 0);
  const activeTypeReviews = a.typePopularity.reduce(
    (sum, type) => sum + type.reviewCount,
    0
  );
  const activeSpiritReviews = a.spiritPopularity.reduce(
    (sum, spirit) => sum + spirit.reviewCount,
    0
  );
  const firstToSecondReviewRate = pct(
    a.membersWithSecondReview,
    a.membersWithFirstReview
  );

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
            title="Onboarding funnel"
            description="How far members make it from account creation through setup and into the core review loop."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="New signups"
                value={a.signupsInRange}
                previous={a.previous.signups}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Completed onboarding"
                value={a.onboardingCompletedInRange}
                hint={`${pct(a.onboardingCompletedTotal, a.totalMembers)} of all members are complete`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Reached first review"
                value={a.membersWithFirstReview}
                hint={`${pct(a.membersWithFirstReview, a.onboardingCompletedTotal)} of completed members`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Reached second review"
                value={a.membersWithSecondReview}
                hint={`${firstToSecondReviewRate} of first reviewers`}
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
            title="Review milestones"
            description="The core loop — who reaches a first review, who comes back for a second, and how quickly that happens."
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
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="First reviews"
                value={a.firstReviewsInRange}
                hint="members whose first-ever review landed in range"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Second reviews"
                value={a.secondReviewsInRange}
                hint="members whose second-ever review landed in range"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="First → second"
                value={firstToSecondReviewRate}
                hint={`${a.membersWithSecondReview} of ${a.membersWithFirstReview} first reviewers`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Time to first review"
                value={
                  a.averageDaysToFirstReview == null
                    ? "—"
                    : `${a.averageDaysToFirstReview.toFixed(1)}d`
                }
                hint="average from account creation"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
            </div>
            <LineChart title="Reviews" data={a.reviewsByDay} unit="reviews" />
          </FeatureSection>

          <FeatureSection
            id="retention"
            title="Seven-day return"
            description="Installations first seen in the selected range that opened the app again exactly seven days later."
          >
            {telemetry.available ? (
              <div className="grid grid-cols-12 gap-4">
                <MetricTile
                  label="Eligible installations"
                  value={telemetry.retention.eligibleInstallations}
                  hint="first seen at least seven days before range end"
                  className="col-span-12 md:col-span-4"
                />
                <MetricTile
                  label="Returned on day 7"
                  value={telemetry.retention.returnedInstallations}
                  className="col-span-12 md:col-span-4"
                />
                <MetricTile
                  label="D7 retention"
                  value={
                    telemetry.retention.rate == null
                      ? "Collecting…"
                      : `${telemetry.retention.rate}%`
                  }
                  hint="requires seven full days of production presence data"
                  className="col-span-12 md:col-span-4"
                />
              </div>
            ) : (
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                Product telemetry is not enabled in this environment yet.
              </p>
            )}
          </FeatureSection>

          <FeatureSection
            id="auth-health"
            title="Authentication health"
            description="Session losses that members did not request. Intentional logout is excluded before an event is emitted."
          >
            {telemetry.available ? (
              <div className="grid grid-cols-12 gap-4">
                <MetricTile
                  label="Unexpected sign-outs"
                  value={telemetry.authHealth.unexpectedSignOuts}
                  hint="session ended while the app was running"
                  className="col-span-12 md:col-span-6 xl:col-span-3"
                />
                <MetricTile
                  label="Missing at launch"
                  value={telemetry.authHealth.sessionMissingAtLaunch}
                  hint="signed in last run, session absent next launch"
                  className="col-span-12 md:col-span-6 xl:col-span-3"
                />
                <MetricTile
                  label="Affected installations"
                  value={telemetry.authHealth.affectedInstallations}
                  className="col-span-12 md:col-span-6 xl:col-span-3"
                />
                <MetricTile
                  label="Affected rate"
                  value={
                    telemetry.authHealth.issueRate == null
                      ? "—"
                      : `${telemetry.authHealth.issueRate}%`
                  }
                  hint="affected ÷ tracked installations in range"
                  className="col-span-12 md:col-span-6 xl:col-span-3"
                />
              </div>
            ) : (
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                Auth-health events will appear after product telemetry is
                deployed.
              </p>
            )}
          </FeatureSection>

          <FeatureSection
            id="versions"
            title="App-version adoption"
            description="The latest version seen for each distinct installation during the selected range."
          >
            {telemetry.available ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_2fr]">
                <MetricTile
                  label="Tracked installations"
                  value={telemetry.trackedInstallations}
                  hint="distinct installations with a heartbeat"
                />
                <BreakdownList
                  title="Version mix"
                  rows={telemetry.versions.map((version) => ({
                    key: version.version,
                    label: version.version,
                    value: `${version.installations.toLocaleString()} · ${version.share}%`,
                  }))}
                  empty="No app versions have reported in this range."
                />
              </div>
            ) : (
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                Version adoption will appear after product telemetry is
                deployed.
              </p>
            )}
          </FeatureSection>

          <FeatureSection
            id="spirits-types"
            title="Spirits & Types"
            description="Review volume by spirit and type enabled in the review composer."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <DonutChart
                title="Spirits"
                total={activeSpiritReviews}
                rows={a.spiritPopularity.map((spirit) => ({
                  key: String(spirit.id),
                  label: spirit.name,
                  count: spirit.reviewCount,
                  share: spirit.share,
                }))}
              />
              <DonutChart
                title="Types"
                total={activeTypeReviews}
                rows={a.typePopularity.map((type) => ({
                  key: String(type.id),
                  label: type.name,
                  count: type.reviewCount,
                  share: type.share,
                }))}
              />
            </div>
          </FeatureSection>

          <FeatureSection
            id="martini-index"
            title="Martini Index"
            description="How often members browse the Index, use its spirit filters, and ask the shaker to choose a Martini."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="Index views"
                value={a.martiniIndexViews}
                previous={a.previous.martiniIndexViews}
                className="col-span-12 md:col-span-4"
              />
              <MetricTile
                label="Filter uses"
                value={a.martiniIndexFilters}
                previous={a.previous.martiniIndexFilters}
                className="col-span-12 md:col-span-4"
              />
              <MetricTile
                label="Martinis generated"
                value={a.martiniIndexGenerations}
                previous={a.previous.martiniIndexGenerations}
                className="col-span-12 md:col-span-4"
              />
            </div>
          </FeatureSection>

          <FeatureSection
            id="places"
            link={{ href: "/admin/places", label: "All places" }}
            title="Places"
            description="Where the club is reviewing: new places, active places, and which venues are carrying the review volume."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="New places"
                value={a.placesInRange}
                previous={a.previous.places}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Reviewed places"
                value={a.reviewedPlacesInRange}
                hint={`${pct(a.reviewedPlacesInRange, a.totalPlaces)} of ${a.totalPlaces} places`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Reviews per place"
                value={
                  a.reviewedPlacesInRange > 0
                    ? (totalReviews / a.reviewedPlacesInRange).toFixed(1)
                    : "—"
                }
                hint="reviews ÷ reviewed places"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Total places"
                value={a.totalPlaces}
                hint="active places"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
            </div>
            <LineChart
              title="Places added"
              data={a.placesByDay}
              color="#336654"
              unit="places"
            />
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="font-semibold">Top places by reviews</h3>
              <ul className="mt-3 divide-y divide-stone-100">
                {a.topPlaces.map((place) => (
                  <li key={place.id}>
                    <Link
                      href={`/admin/places/${place.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-stone-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-stone-900">
                          {place.name ?? "Unknown place"}
                        </span>
                        <span className="block truncate text-xs text-stone-500">
                          {formatCityRegion(place.address) || "No address"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm">
                        <span className="block font-semibold text-stone-600">
                          {place.reviews_in_range} reviews
                        </span>
                        <span className="text-xs text-stone-400">
                          {place.rating == null
                            ? "No rating"
                            : `${Number(place.rating).toFixed(1)} rating`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {a.topPlaces.length === 0 && (
                  <li className="py-2.5 text-sm text-stone-400">
                    No places were reviewed in this range.
                  </li>
                )}
              </ul>
            </div>
          </FeatureSection>

          <FeatureSection
            id="engagement"
            link={{ href: "/admin/reviews", label: "All reviews" }}
            title="Social actions"
            description="Successful follows, review likes, comment likes, and conversations across the club."
          >
            <div className="grid grid-cols-12 gap-4">
              <MetricTile
                label="New follows"
                value={a.followsInRange}
                previous={a.previous.follows}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Review likes"
                value={totalLikes}
                previous={a.previous.likes}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Comment likes"
                value={totalCommentLikes}
                previous={a.previous.commentLikes}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MetricTile
                label="Comments"
                value={totalComments}
                previous={a.previous.comments}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <LineChart
                title="New follows"
                data={a.followsByDay}
                color="#059669"
                unit="follows"
              />
              <LineChart
                title="Review likes"
                data={a.likesByDay}
                color="#e11d48"
                unit="likes"
              />
              <LineChart
                title="Comment likes"
                data={a.commentLikesByDay}
                color="#7c3aed"
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
                  label: reviewShareChannelLabel(channel.channel),
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
            <DataTable
              columns={["Member", "Format", "Review", "Outcome", "When"]}
              toolbar={
                <div className="px-2 py-1">
                  <h3 className="font-semibold text-stone-900">
                    Recent review sharing
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    The latest Story, Post, and link activity in this range.
                  </p>
                </div>
              }
              empty={
                a.recentReviewShares.length === 0 ? (
                  <EmptyState>
                    No review sharing activity in this range.
                  </EmptyState>
                ) : null
              }
            >
              {a.recentReviewShares.map((share) => (
                <tr key={share.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${share.profile.id}`}>
                      <UserBadge profile={share.profile} size="compact" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      tone={
                        share.channel.startsWith("instagram_")
                          ? "purple"
                          : "green"
                      }
                    >
                      {reviewShareChannelLabel(share.channel)}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/reviews/${share.review_id}`}
                      className="font-semibold text-stone-800 transition hover:text-violet-700"
                    >
                      {share.location_name ?? `Review #${share.review_id}`}
                    </Link>
                    {share.location_name ? (
                      <span className="mt-0.5 block font-mono text-xs text-stone-400">
                        Review #{share.review_id}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-stone-600">
                    {share.outcome}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-500">
                    <span className="block">
                      {new Date(share.shared_at).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-xs text-stone-400">
                      {new Date(share.shared_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
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
