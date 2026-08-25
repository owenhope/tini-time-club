import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatCityRegion } from "@/lib/format";
import type { SortDirection } from "@/lib/data";
import type {
  AdminLocation,
  AdminRegion,
  GoldenGlassInspectionRow,
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
  const offset = (Math.max(1, page) - 1) * perPage;
  let query = db()
    .from("locations")
    .select(
      "id,name,address,neighborhood,region_id,golden_glass_eligible,golden_glass_ineligibility_reason"
    )
    .order("name", { ascending: true });
  if (search) {
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const ratings = new Map<number, { rating: number | null; total: number }>();
  if (ids.length > 0) {
    const { data: ratingRows, error: ratingError } = await db()
      .from("location_ratings")
      .select("id,rating,total_ratings")
      .in("id", ids);
    if (ratingError) throw new Error(ratingError.message);
    for (const row of ratingRows ?? []) {
      ratings.set(row.id, {
        rating: row.rating ?? null,
        total: row.total_ratings ?? 0,
      });
    }
  }

  const locations = rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    neighborhood: row.neighborhood ?? null,
    region_id: row.region_id ?? null,
    golden_glass_eligible: row.golden_glass_eligible ?? true,
    golden_glass_ineligibility_reason:
      row.golden_glass_ineligibility_reason ?? null,
    rating: ratings.get(row.id)?.rating ?? null,
    total_ratings: ratings.get(row.id)?.total ?? 0,
  }));
  const filtered =
    minReviews > 0
      ? locations.filter((location) => location.total_ratings >= minReviews)
      : locations;
  const sorted = [...filtered].sort((left, right) => {
    const byPlace =
      (left.name ?? "").localeCompare(right.name ?? "") ||
      String(left.id).localeCompare(String(right.id));
    const placeTie = direction === "asc" ? byPlace : -byPlace;

    if (sort === "area") {
      const byArea =
        formatCityRegion(left.address).localeCompare(
          formatCityRegion(right.address)
        ) || byPlace;
      return direction === "asc" ? byArea : -byArea;
    }

    if (sort === "rating") {
      const byRating =
        (left.rating ?? -1) - (right.rating ?? -1) ||
        left.total_ratings - right.total_ratings ||
        byPlace;
      return direction === "asc" ? byRating : -byRating || placeTie;
    }

    if (sort === "reviews") {
      const byReviews =
        left.total_ratings - right.total_ratings ||
        (left.rating ?? -1) - (right.rating ?? -1) ||
        byPlace;
      return direction === "asc" ? byReviews : -byReviews || placeTie;
    }

    return direction === "asc" ? byPlace : -byPlace;
  });

  return {
    locations: sorted.slice(offset, offset + perPage),
    total: sorted.length,
  };
};

interface GoldenGlassInspectionRpcRow {
  region_id: number | string;
  location_id: number | string;
  calculated_rank: number | string;
  raw_overall: number | string;
  adjusted_score: number | string;
  distinct_reviewers: number | string;
  [key: string]: unknown;
}

export const fetchGoldenGlassInspection = async (
  regionId?: string
): Promise<GoldenGlassInspectionRow[]> => {
  const numericRegionId =
    regionId && /^\d+$/.test(regionId) ? Number(regionId) : null;
  const { data, error } = await db().rpc("get_golden_glass_inspection_v1", {
    p_region_id: numericRegionId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: GoldenGlassInspectionRpcRow) => ({
    ...row,
    region_id: Number(row.region_id),
    location_id: Number(row.location_id),
    calculated_rank: Number(row.calculated_rank),
    raw_overall: Number(row.raw_overall),
    adjusted_score: Number(row.adjusted_score),
    distinct_reviewers: Number(row.distinct_reviewers),
  })) as GoldenGlassInspectionRow[];
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
  if (regionsResult.error) throw new Error(regionsResult.error.message);

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
  const { data, error } = await query;
  if (error) throw new Error(error.message);

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
