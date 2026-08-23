import "server-only";
import { unstable_cache } from "next/cache";
import { resolveEngagement } from "@/lib/analytics/engagementModel.mjs";
import { rangeArgs, type DayCount } from "@/lib/analytics/shared";
import type { AdminProfile } from "@/lib/data";
import type { DateRange } from "@/lib/range";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ActionCounts {
  follows: number;
  likes: number;
  commentLikes: number;
  comments: number;
  shares: number;
  invites: number;
}

export interface EngagementAnalytics {
  current: ActionCounts;
  previous: ActionCounts;
  followsByDay: DayCount[];
  likesByDay: DayCount[];
  commentLikesByDay: DayCount[];
  commentsByDay: DayCount[];
  sharesByDay: DayCount[];
  invitesByDay: DayCount[];
  shareChannels: { channel: string; count: number }[];
  inviteChannels: { channel: string; count: number }[];
  topSharers: (AdminProfile & {
    shareCount: number;
    lastSharedAt: string;
  })[];
  recentReviewShares: {
    id: string;
    reviewId: number;
    locationName: string | null;
    channel: string;
    outcome: string;
    sharedAt: string;
    profile: AdminProfile;
  }[];
  hasMore: boolean;
  nextCursorAt: string | null;
  nextCursorId: string | null;
}

const loadEngagement = unstable_cache(
  async (
    p_since: string,
    p_until: string,
    p_cursor_at: string | null,
    p_cursor_id: string | null
  ): Promise<EngagementAnalytics> => {
    const { data, error } = await supabaseAdmin().rpc(
      "get_admin_engagement_analytics",
      { p_since, p_until, p_limit: 20, p_cursor_at, p_cursor_id }
    );
    if (error) throw new Error(error.message);
    return resolveEngagement(data) as EngagementAnalytics;
  },
  ["admin-engagement-analytics-v1"],
  { revalidate: 60 }
);

export const fetchEngagementAnalytics = (
  range: DateRange,
  cursor?: { at: string; id: string }
) => {
  const args = rangeArgs(range);
  return loadEngagement(
    args.p_since,
    args.p_until,
    cursor?.at ?? null,
    cursor?.id ?? null
  );
};
