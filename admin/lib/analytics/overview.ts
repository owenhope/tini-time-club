import "server-only";
import { unstable_cache } from "next/cache";
import { resolveOverview } from "@/lib/analytics/overviewModel.mjs";
import { rangeArgs, type DayCount } from "@/lib/analytics/shared";
import { toAdminDataError } from "@/lib/dataErrors";
import type { DateRange } from "@/lib/range";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ActivityCounts {
  members: number;
  reviews: number;
  places: number;
  follows: number;
  likes: number;
  comments: number;
  shares: number;
  indexInteractions: number;
}

export interface AnalyticsOverview {
  totals: Pick<ActivityCounts, "members" | "reviews" | "places">;
  current: ActivityCounts;
  previous: ActivityCounts;
  membersByDay: DayCount[];
  reviewsByDay: DayCount[];
  placesByDay: DayCount[];
}

const loadOverview = unstable_cache(
  async (p_since: string, p_until: string): Promise<AnalyticsOverview> => {
    const { data, error } = await supabaseAdmin().rpc(
      "get_admin_analytics_overview",
      { p_since, p_until }
    );
    if (error) throw toAdminDataError(error, "load analytics overview");
    return resolveOverview(data) as AnalyticsOverview;
  },
  ["admin-analytics-overview-v1"],
  { revalidate: 60 }
);

export const fetchAnalyticsOverview = (range: DateRange) => {
  const args = rangeArgs(range);
  return loadOverview(args.p_since, args.p_until);
};
