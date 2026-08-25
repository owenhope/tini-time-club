import "server-only";
import { toAdminDataError } from "@/lib/dataErrors";
import { normalizeGoldenGlassInspectionRows } from "@/lib/placeModels";
import { emptyReviewEngagement } from "@/lib/reviewTypes";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { SortDirection } from "@/lib/profileTypes";
import type {
  AdminLocationDetail,
  AdminLocation,
  AdminRegion,
  GoldenGlassInspectionRow,
  LocationCounts,
  LocationSort,
  MapBounds,
  MapPlace,
} from "@/lib/placeTypes";

const db = supabaseAdmin;
const LOCATIONS_PAGE_SIZE = 50;

export const fetchLocations = async (
  search?: string,
  page = 1,
  perPage = LOCATIONS_PAGE_SIZE,
  minReviews = 0,
  sort: LocationSort = "place",
  direction: SortDirection = "asc"
): Promise<{ locations: AdminLocation[]; total: number }> => {
  const { data, error } = await db().rpc("get_admin_locations_page", {
    p_search: search ?? null,
    p_min_reviews: minReviews,
    p_sort: sort,
    p_direction: direction,
    p_page: page,
    p_per_page: perPage,
  });
  if (error) throw toAdminDataError(error, "load locations");
  const result = (data ?? {}) as {
    locations?: AdminLocation[];
    total?: number;
  };
  return {
    locations: result.locations ?? [],
    total: Number(result.total) || 0,
  };
};

export const fetchGoldenGlassInspection = async (
  regionId?: string
): Promise<GoldenGlassInspectionRow[]> => {
  const numericRegionId =
    regionId && /^\d+$/.test(regionId) ? Number(regionId) : null;
  const { data, error } = await db().rpc("get_golden_glass_inspection_v1", {
    p_region_id: numericRegionId,
  });
  if (error) throw toAdminDataError(error, "load Golden Glass inspection");
  return normalizeGoldenGlassInspectionRows(data ?? []);
};

export const fetchAdminRegions = async (): Promise<AdminRegion[]> => {
  const [regionsResult, goldenGlassRows] = await Promise.all([
    db()
      .from("regions")
      .select(
        "id,slug,name,enabled,display_order,center_lat,center_lon,catchment_radius_m"
      )
      .order("display_order")
      .order("name"),
    fetchGoldenGlassInspection(),
  ]);
  if (regionsResult.error)
    throw toAdminDataError(regionsResult.error, "load regions");

  const goldenGlassCounts = new Map<number, number>();
  const qualifyingLocationCounts = new Map<number, number>();
  for (const row of goldenGlassRows) {
    const regionId = row.region_id;
    qualifyingLocationCounts.set(
      regionId,
      (qualifyingLocationCounts.get(regionId) ?? 0) + 1
    );
    if (row.is_current) {
      goldenGlassCounts.set(
        regionId,
        (goldenGlassCounts.get(regionId) ?? 0) + 1
      );
    }
  }

  return (regionsResult.data ?? []).map((region) => ({
    ...region,
    id: Number(region.id),
    golden_glass_count: goldenGlassCounts.get(Number(region.id)) ?? 0,
    qualifying_location_count:
      qualifyingLocationCounts.get(Number(region.id)) ?? 0,
  })) as AdminRegion[];
};

export const fetchMapPlaces = async (
  bounds?: MapBounds
): Promise<MapPlace[]> => {
  if (!bounds) return [];

  let query = db()
    .from("location_ratings")
    .select(
      "id,name,address,lat,lon,rating,taste_avg,presentation_avg,total_ratings"
    );
  if (bounds) {
    query = query
      .gte("lat", bounds.minLat)
      .lte("lat", bounds.maxLat)
      .gte("lon", bounds.minLon)
      .lte("lon", bounds.maxLon);
  }
  query = query.limit(1000);
  const { data, error } = await query;
  if (error) throw toAdminDataError(error, "load map places");

  return (data ?? [])
    .filter((row) => row.lat != null && row.lon != null)
    .map((row) => ({
      id: row.id,
      name: row.name ?? null,
      address: row.address ?? null,
      lat: Number(row.lat),
      lon: Number(row.lon),
      rating: row.rating ?? null,
      taste_avg: row.taste_avg ?? null,
      presentation_avg: row.presentation_avg ?? null,
      total_ratings: row.total_ratings ?? 0,
    }));
};

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
  if (total.error) throw toAdminDataError(total.error, "count locations");
  if (rated.error) throw toAdminDataError(rated.error, "count rated locations");
  if (strong.error)
    throw toAdminDataError(strong.error, "count highly rated locations");
  return {
    total: total.count ?? 0,
    rated: rated.count ?? 0,
    strong: strong.count ?? 0,
  };
};

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

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
  if (locationResult.error)
    throw toAdminDataError(locationResult.error, "load location detail");
  if (ratingResult.error)
    throw toAdminDataError(ratingResult.error, "load location rating");
  if (reviewsResult.error)
    throw toAdminDataError(reviewsResult.error, "load location reviews");
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
      engagement: emptyReviewEngagement(),
    })),
  };
};
