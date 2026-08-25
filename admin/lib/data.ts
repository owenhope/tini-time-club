import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { AdminLocation } from "@/lib/placeTypes";
import type {
  AdminProfile,
  NotificationAudienceMember,
  ProfileCounts,
  ProfileSort,
  SortDirection,
} from "@/lib/profileTypes";
import type {
  AdminReview,
  AdminReviewDetail,
  AdminReviewRow,
  ReviewCounts,
  TopReview,
} from "@/lib/reviewTypes";
import {
  fetchActiveLocationIds,
  fetchActiveMemberIds,
  fetchAuthUsers,
  fetchNotificationAudienceMembers,
  fetchProfile,
  fetchProfileCounts,
  fetchProfiles,
  fetchTopReviewers,
} from "@/lib/profileData";
import {
  fetchAdminReview,
  fetchAllReviews,
  fetchReviewCounts,
} from "@/lib/reviewData";
import {
  fetchAudienceUsage,
  fetchDashboardKpis,
  fetchLiveActivity,
  fetchProductTelemetry,
  fetchTierDistribution,
} from "@/lib/analyticsData";
import {
  fetchNotificationAnalytics,
  fetchPushTokenCount,
  fetchRecentNotifications,
  fetchWeeklyPushSubscriberCount,
} from "@/lib/notificationData";
import {
  fetchModerationReportCounts,
  fetchModerationReports,
} from "@/lib/moderationData";
import {
  fetchSharePreviewLocations,
  fetchSharePreviewReviews,
} from "@/lib/sharePreviewData";
import {
  fetchLatestActivity,
  fetchTopActivity,
} from "@/lib/dashboardActivityData";
import {
  fetchAdminRegions,
  fetchGoldenGlassInspection,
  fetchLocations,
  fetchMapPlaces,
} from "@/lib/placeData";

export type {
  AdminLocation,
  AdminRegion,
  GoldenGlassInspectionRow,
  LocationSort,
  MapBounds,
  MapPlace,
} from "@/lib/placeTypes";

export {
  fetchAdminRegions,
  fetchGoldenGlassInspection,
  fetchLocations,
  fetchMapPlaces,
} from "@/lib/placeData";

export type {
  AdminProfile,
  NotificationAudienceMember,
  ProfileCounts,
  ProfileSort,
  SortDirection,
} from "@/lib/profileTypes";
export type {
  AdminReview,
  AdminReviewDetail,
  AdminReviewRow,
  ReviewCounts,
  TopReview,
} from "@/lib/reviewTypes";
export {
  fetchAuthUsers,
  fetchNotificationAudienceMembers,
  fetchProfile,
  fetchProfileCounts,
  fetchProfiles,
  fetchTopReviewers,
  USERS_PAGE_SIZE,
} from "@/lib/profileData";
export { fetchAdminReview, fetchAllReviews, fetchReviewCounts } from "@/lib/reviewData";
export {
  fetchAudienceUsage,
  fetchDashboardKpis,
  fetchLiveActivity,
  fetchProductTelemetry,
  fetchTierDistribution,
} from "@/lib/analyticsData";
export {
  fetchNotificationAnalytics,
  fetchPushTokenCount,
  fetchRecentNotifications,
  fetchWeeklyPushSubscriberCount,
} from "@/lib/notificationData";
export type {
  AdminNotification,
  NotificationAnalytics,
  NotificationKindStats,
} from "@/lib/notificationData";
export {
  fetchModerationReportCounts,
  fetchModerationReports,
} from "@/lib/moderationData";
export type {
  ModerationContentType,
  ModerationReport,
  ModerationReportCounts,
  ModerationStatus,
} from "@/lib/moderationData";
export type {
  AudienceUsage,
  DashboardKpis,
  KpiMetric,
  LiveActivity,
  LiveActivityEvent,
  LiveActivityTone,
  ProductTelemetry,
  TierDistributionRow,
} from "@/lib/analyticsData";

const db = supabaseAdmin;
export { fetchSharePreviewLocations, fetchSharePreviewReviews } from "@/lib/sharePreviewData";
export type { SharePreviewLocation, SharePreviewReview } from "@/lib/sharePreviewData";
export { fetchLatestActivity, fetchTopActivity } from "@/lib/dashboardActivityData";
export type {
  LatestActivity,
  LatestLocation,
  TopActivity,
  TopLocation,
} from "@/lib/dashboardActivityData";

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const emptyEngagement = () => ({ likes: 0, comments: 0, shares: 0 });

export interface AdminLocationDetail extends AdminLocation {
  place_id: string | null;
  inserted_at: string;
  created_by: string;
  all_reviews: number;
  reviews: AdminReviewRow[];
}

export interface LocationCounts {
  total: number;
  rated: number;
  strong: number;
}

export const fetchLocationCounts = async (): Promise<LocationCounts> => {
  const [total, rated, strong] = await Promise.all([
    db().from("locations").select("id", { count: "exact", head: true }),
    db()
      .from("location_ratings")
      .select("id", { count: "exact", head: true })
      .gte("total_ratings", 1),
    db()
      .from("location_ratings")
      .select("id", { count: "exact", head: true })
      .gte("total_ratings", 5),
  ]);
  if (total.error) throw new Error(total.error.message);
  if (rated.error) throw new Error(rated.error.message);
  if (strong.error) throw new Error(strong.error.message);
  return {
    total: total.count ?? 0,
    rated: rated.count ?? 0,
    strong: strong.count ?? 0,
  };
};

export const fetchAdminLocation = async (
  id: string
): Promise<AdminLocationDetail | null> => {
  if (!/^\d+$/.test(id)) return null;

  const [locationResult, ratingResult, reviewsResult] = await Promise.all([
    db()
      .from("locations")
      .select(
        "id,name,address,place_id,neighborhood,region_id,golden_glass_eligible,golden_glass_ineligibility_reason,inserted_at,created_by"
      )
      .eq("id", id)
      .maybeSingle(),
    db()
      .from("location_ratings")
      .select("rating,total_ratings")
      .eq("id", id)
      .maybeSingle(),
    db()
      .from("reviews")
      .select(
        `id,comment,taste,presentation,inserted_at,state,
         profile:profiles!reviews_user_id_fkey1(id,username,name,avatar_url,is_verified,deleted,deleted_at,review_count,bio)`,
        { count: "exact" }
      )
      .eq("location", id)
      .order("inserted_at", { ascending: false })
      .limit(50),
  ]);
  if (locationResult.error) throw new Error(locationResult.error.message);
  if (ratingResult.error) throw new Error(ratingResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (!locationResult.data) return null;

  const location = locationResult.data;
  return {
    id: location.id,
    name: location.name,
    address: location.address,
    place_id: location.place_id,
    inserted_at: location.inserted_at,
    created_by: location.created_by,
    neighborhood: location.neighborhood ?? null,
    region_id: location.region_id ?? null,
    golden_glass_eligible: location.golden_glass_eligible ?? true,
    golden_glass_ineligibility_reason:
      location.golden_glass_ineligibility_reason ?? null,
    rating: ratingResult.data?.rating ?? null,
    total_ratings: ratingResult.data?.total_ratings ?? 0,
    all_reviews: reviewsResult.count ?? 0,
    reviews: (reviewsResult.data ?? []).map((review) => ({
      id: String(review.id),
      comment: review.comment,
      taste: review.taste,
      presentation: review.presentation,
      inserted_at: review.inserted_at,
      state: review.state,
      location: { id: location.id, name: location.name },
      profile: one(review.profile),
      engagement: emptyEngagement(),
    })),
  };
};
