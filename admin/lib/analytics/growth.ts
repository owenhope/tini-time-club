import "server-only";
import { unstable_cache } from "next/cache";
import { resolveGrowth } from "@/lib/analytics/growthModel.mjs";
import { rangeArgs, type DayCount } from "@/lib/analytics/shared";
import type { DateRange } from "@/lib/range";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface GrowthAnalytics {
  totalMembers: number;
  signupsInRange: number;
  previousSignups: number;
  reviewsInRange: number;
  previousReviews: number;
  reviewedInRange: number;
  onboardingCompletedTotal: number;
  onboardingCompletedInRange: number;
  membersWithFirstReview: number;
  membersWithSecondReview: number;
  firstReviewsInRange: number;
  secondReviewsInRange: number;
  averageDaysToFirstReview: number | null;
  signupsByDay: DayCount[];
  reviewsByDay: DayCount[];
}

const loadGrowth = unstable_cache(
  async (p_since: string, p_until: string): Promise<GrowthAnalytics> => {
    const { data, error } = await supabaseAdmin().rpc(
      "get_admin_growth_analytics",
      { p_since, p_until }
    );
    if (error) throw new Error(error.message);
    return resolveGrowth(data) as GrowthAnalytics;
  },
  ["admin-growth-analytics-v1"],
  { revalidate: 60 }
);

export const fetchGrowthAnalytics = (range: DateRange) => {
  const args = rangeArgs(range);
  return loadGrowth(args.p_since, args.p_until);
};
