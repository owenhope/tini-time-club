import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import type { AdminProfile } from "@/lib/profileTypes";
import type { AdminReviewRow, TopReview } from "@/lib/reviewTypes";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveDashboardActivityResponse } from "./dashboardActivityModel.mjs";

export interface LatestLocation {
  id: number;
  name: string | null;
  address: string | null;
  inserted_at: string | null;
}

export interface LatestActivity {
  members: AdminProfile[];
  reviews: AdminReviewRow[];
  locations: LatestLocation[];
}

export interface TopLocation {
  id: number;
  name: string | null;
  rating: number | null;
  total_ratings: number;
}

export interface TopActivity {
  members: AdminProfile[];
  reviews: TopReview[];
  locations: TopLocation[];
}

const db = supabaseAdmin;

export const fetchDashboardActivity = async (
  limit = 10
): Promise<{ latest: LatestActivity; top: TopActivity }> => {
  const { data, error } = await db().rpc("get_admin_dashboard_activity", {
    p_limit: limit,
  });
  if (error) throw toAdminDataError(error, "load dashboard activity");

  return resolveDashboardActivityResponse(data) as {
    latest: LatestActivity;
    top: TopActivity;
  };
};
