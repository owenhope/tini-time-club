import "server-only";
import { unstable_cache } from "next/cache";
import { resolvePassport } from "@/lib/analytics/passportModel.mjs";
import { rangeArgs, type DayCount } from "@/lib/analytics/shared";
import { toAdminDataError } from "@/lib/dataErrors";
import type { AdminProfile } from "@/lib/profileTypes";
import type { DateRange } from "@/lib/range";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface PassportPeriod {
  stamps: number;
  points: number;
  earningMembers: number;
}

export interface PassportAnalytics {
  totals: {
    stampsAwarded: number;
    membersWithStamps: number;
    pointsInCirculation: number;
  };
  current: PassportPeriod;
  previous: PassportPeriod;
  stampsByDay: DayCount[];
  /** Distinct passport_points values with member counts, for tier bucketing. */
  pointsDistribution: { points: number; count: number }[];
  topStamps: {
    key: string;
    series: string;
    title: string;
    label: string;
    points: number;
    awardCount: number;
    lastAwardedAt: string;
  }[];
  topMembers: (AdminProfile & {
    passportPoints: number;
    stampCount: number;
    lastAwardAt: string | null;
  })[];
  recentAwards: {
    id: string;
    awardedAt: string;
    title: string;
    label: string;
    series: string;
    points: number;
    profile: AdminProfile;
  }[];
}

const loadPassport = unstable_cache(
  async (p_since: string, p_until: string): Promise<PassportAnalytics> => {
    const { data, error } = await supabaseAdmin().rpc(
      "get_admin_passport_analytics",
      { p_since, p_until }
    );
    if (error) throw toAdminDataError(error, "load passport analytics");
    return resolvePassport(data) as PassportAnalytics;
  },
  ["admin-analytics-passport-v1"],
  { revalidate: 60 }
);

export const fetchPassportAnalytics = (range: DateRange) => {
  const args = rangeArgs(range);
  return loadPassport(args.p_since, args.p_until);
};
