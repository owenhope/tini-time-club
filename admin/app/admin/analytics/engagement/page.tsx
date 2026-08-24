import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import AnalyticsHeader from "@/components/AnalyticsHeader";
import {
  DataTable,
  EmptyState,
  StatusPill,
} from "@/components/AdminPrimitives";
import FeatureSection, { BreakdownList } from "@/components/FeatureSection";
import LineChart from "@/components/LineChart";
import MetricTile from "@/components/MetricTile";
import UserBadge from "@/components/UserBadge";
import { fetchEngagementAnalytics } from "@/lib/analytics/engagement";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

const SHARE_LABELS: Record<string, string> = {
  instagram_story: "Instagram Story",
  instagram_post: "Instagram Post",
  share_link: "Share Link",
  sheet: "Share Sheet",
  email: "Email",
  instagram: "Instagram",
};
const channelLabel = (channel: string) =>
  SHARE_LABELS[channel] ?? channel.replaceAll("_", " ");
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EngagementAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    from?: string;
    to?: string;
    cursorAt?: string;
    cursorId?: string;
  }>;
}) {
  const params = await searchParams;
  const range = parseRange(params);
  const cursor =
    params.cursorAt &&
    params.cursorId &&
    UUID.test(params.cursorId) &&
    !Number.isNaN(Date.parse(params.cursorAt))
      ? { at: params.cursorAt, id: params.cursorId }
      : undefined;
  const engagement = await fetchEngagementAnalytics(range, cursor);
  const nextQuery =
    engagement.hasMore && engagement.nextCursorAt && engagement.nextCursorId
      ? `${range.query}&cursorAt=${encodeURIComponent(engagement.nextCursorAt)}&cursorId=${encodeURIComponent(engagement.nextCursorId)}`
      : null;

  return (
    <AdminShell active="analytics">
      <AnalyticsHeader
        active="engagement"
        range={range}
        title="Engagement"
        description="Social actions, sharing, referrals, and the bounded event detail behind them."
      />
      <main className="space-y-8 px-8 pb-32 pt-6">
        <FeatureSection
          id="social"
          title="Social actions"
          description="Successful follows, review likes, comment likes, and conversations across the club."
          link={{ href: "/admin/reviews", label: "All reviews" }}
        >
          <div className="grid grid-cols-12 gap-4">
            <MetricTile
              label="New follows"
              value={engagement.current.follows}
              previous={engagement.previous.follows}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Review likes"
              value={engagement.current.likes}
              previous={engagement.previous.likes}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Comment likes"
              value={engagement.current.commentLikes}
              previous={engagement.previous.commentLikes}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
            <MetricTile
              label="Comments"
              value={engagement.current.comments}
              previous={engagement.previous.comments}
              className="col-span-12 md:col-span-6 xl:col-span-3"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <LineChart
              title="New follows"
              data={engagement.followsByDay}
              color="#059669"
              unit="follows"
            />
            <LineChart
              title="Review likes"
              data={engagement.likesByDay}
              color="#e11d48"
              unit="likes"
            />
            <LineChart
              title="Comment likes"
              data={engagement.commentLikesByDay}
              color="#7c3aed"
              unit="likes"
            />
            <LineChart
              title="Comments"
              data={engagement.commentsByDay}
              color="#d97706"
              unit="comments"
            />
          </div>
        </FeatureSection>

        <FeatureSection
          id="sharing"
          title="Sharing & referral"
          description="The growth loops created when members share reviews and invitations."
          link={{ href: "/admin/share-preview", label: "Share preview" }}
        >
          <div className="grid grid-cols-12 gap-4">
            <MetricTile
              label="Review shares"
              value={engagement.current.shares}
              previous={engagement.previous.shares}
              className="col-span-12 md:col-span-6"
            />
            <MetricTile
              label="Invites"
              value={engagement.current.invites}
              previous={engagement.previous.invites}
              className="col-span-12 md:col-span-6"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <LineChart
              title="Review shares"
              data={engagement.sharesByDay}
              color="#7c3aed"
              unit="shares"
            />
            <LineChart
              title="Invites"
              data={engagement.invitesByDay}
              color="#db2777"
              unit="invites"
            />
            <BreakdownList
              title="Review share channels"
              rows={engagement.shareChannels.map((channel) => ({
                key: channel.channel,
                label: channelLabel(channel.channel),
                value: String(channel.count),
              }))}
              empty="No shares in this range."
            />
            <BreakdownList
              title="Invite channels"
              rows={engagement.inviteChannels.map((channel) => ({
                key: channel.channel,
                label: channelLabel(channel.channel),
                value: String(channel.count),
              }))}
              empty="No invites in this range."
            />
          </div>
          <DataTable
            columns={["Member", "Format", "Review", "Outcome", "When"]}
            toolbar={
              <div className="flex items-center justify-between gap-4 px-2 py-1">
                <div>
                  <h3 className="font-semibold text-stone-900">
                    Recent review sharing
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    20 rows at a time so this remains fast as event volume
                    grows.
                  </p>
                </div>
                {cursor ? (
                  <Link
                    href={`/admin/analytics/engagement?${range.query}`}
                    className="text-sm font-bold text-violet-700 hover:text-violet-900"
                  >
                    Newest
                  </Link>
                ) : null}
              </div>
            }
            empty={
              engagement.recentReviewShares.length === 0 ? (
                <EmptyState>
                  No review sharing activity in this range.
                </EmptyState>
              ) : null
            }
          >
            {engagement.recentReviewShares.map((share) => (
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
                    {channelLabel(share.channel)}
                  </StatusPill>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/reviews/${share.reviewId}`}
                    className="font-semibold text-stone-800 transition hover:text-violet-700"
                  >
                    {share.locationName ?? `Review #${share.reviewId}`}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm capitalize text-stone-600">
                  {share.outcome}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-500">
                  {new Date(share.sharedAt).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
              </tr>
            ))}
          </DataTable>
          {nextQuery ? (
            <div className="flex justify-end">
              <Link
                href={`/admin/analytics/engagement?${nextQuery}`}
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
              >
                Older activity →
              </Link>
            </div>
          ) : null}
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="font-semibold">Top sharers</h3>
            <ul className="mt-3 divide-y divide-stone-100">
              {engagement.topSharers.map((profile) => (
                <li key={profile.id}>
                  <Link
                    href={`/admin/users/${profile.id}`}
                    className="flex items-center justify-between py-2.5 transition hover:bg-stone-50"
                  >
                    <UserBadge profile={profile} />
                    <span className="text-right text-sm">
                      <span className="block font-semibold text-stone-600">
                        {profile.shareCount}
                      </span>
                      <span className="text-xs text-stone-400">
                        {new Date(profile.lastSharedAt).toLocaleDateString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {engagement.topSharers.length === 0 ? (
                <li className="py-2.5 text-sm text-stone-400">
                  No members have shared in this range.
                </li>
              ) : null}
            </ul>
          </div>
        </FeatureSection>
      </main>
    </AdminShell>
  );
}
