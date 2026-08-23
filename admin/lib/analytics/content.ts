import "server-only";
import { unstable_cache } from "next/cache";
import { resolveContent } from "@/lib/analytics/contentModel.mjs";
import { rangeArgs, type DayCount } from "@/lib/analytics/shared";
import type { DateRange } from "@/lib/range";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface PopularityRow {
  id: number;
  name: string;
  reviewCount: number;
  share: number;
}

export interface ContentAnalytics {
  totalPlaces: number;
  placesInRange: number;
  previousPlaces: number;
  reviewedPlacesInRange: number;
  reviewsInRange: number;
  martiniIndex: { views: number; filters: number; generations: number };
  previousMartiniIndex: {
    views: number;
    filters: number;
    generations: number;
  };
  placesByDay: DayCount[];
  typePopularity: PopularityRow[];
  spiritPopularity: PopularityRow[];
  topPlaces: {
    id: number;
    name: string | null;
    address: string | null;
    rating: number | null;
    totalRatings: number;
    reviewsInRange: number;
  }[];
}

const loadContent = unstable_cache(
  async (p_since: string, p_until: string): Promise<ContentAnalytics> => {
    const { data, error } = await supabaseAdmin().rpc(
      "get_admin_content_analytics",
      { p_since, p_until }
    );
    if (error) throw new Error(error.message);
    return resolveContent(data) as ContentAnalytics;
  },
  ["admin-content-analytics-v1"],
  { revalidate: 60 }
);

export const fetchContentAnalytics = (range: DateRange) => {
  const args = rangeArgs(range);
  return loadContent(args.p_since, args.p_until);
};
