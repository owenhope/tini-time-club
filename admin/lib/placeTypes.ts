import type { AdminReviewRow } from "@/lib/reviewTypes";
import type { AdminLocationClaim } from "@/lib/claimTypes";

export interface AdminLocation {
  id: number;
  name: string | null;
  address: string | null;
  rating: number | null;
  total_ratings: number;
  is_golden_glass?: boolean;
  is_location_verified?: boolean;
  neighborhood?: string | null;
  region_id?: number | null;
  golden_glass_eligible?: boolean;
  golden_glass_ineligibility_reason?: string | null;
}

export type LocationSort = "place" | "area" | "rating" | "reviews";

export interface MapPlace {
  id: number;
  name: string | null;
  address: string | null;
  lat: number;
  lon: number;
  rating: number | null;
  taste_avg: number | null;
  presentation_avg: number | null;
  total_ratings: number;
  is_golden_glass?: boolean;
  is_location_verified?: boolean;
}

export interface AdminRegion {
  id: number;
  slug: string;
  name: string;
  enabled: boolean;
  display_order: number;
  center_lat: number;
  center_lon: number;
  catchment_radius_m: number;
  golden_glass_count: number;
  qualifying_location_count: number;
}

export interface GoldenGlassInspectionRow {
  region_id: number;
  location_id: number;
  calculated_rank: number;
  is_current: boolean;
  venue_name: string | null;
  raw_overall: number;
  adjusted_score: number;
  distinct_reviewers: number;
  latest_review_at: string;
  eligible: boolean;
  ineligibility_reason: string | null;
  refreshed_at: string | null;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface LocationCounts {
  total: number;
  rated: number;
  strong: number;
}

export interface AdminLocationDetail extends AdminLocation {
  place_id: string | null;
  inserted_at: string;
  created_by: string;
  all_reviews: number;
  reviews: AdminReviewRow[];
  claims: AdminLocationClaim[];
  is_location_verified?: boolean;
}
