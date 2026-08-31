import { supabase } from "@/utils/supabase";
import {
  getRegularsByLocation,
  type Regular,
} from "@/services/regularsService";

export interface GoldenGlassRecipient {
  regionId: number;
  locationId: number;
  venueName: string;
  address: string | null;
  neighborhood: string | null;
  rawOverall: number;
  distinctReviewers: number;
  latestReviewAt: string;
  refreshedAt: string;
  regulars: Regular[];
  isGoldenGlass: true;
  is_location_verified: boolean;
}

export async function getGoldenGlassRecipients(
  regionId: number
): Promise<GoldenGlassRecipient[]> {
  const { data, error } = await supabase.rpc("get_golden_glass_v1", {
    p_region_id: regionId,
  });
  if (error) throw error;

  const rows = (data ?? []) as any[];
  const regulars = await getRegularsByLocation(
    rows.map((row) => Number(row.location_id))
  );
  const { data: verificationRows } = await supabase
    .from("location_ratings")
    .select("id,is_location_verified")
    .in(
      "id",
      rows.map((row) => Number(row.location_id))
    );
  const verifiedByLocation = new Map(
    (verificationRows ?? []).map((row) => [
      String(row.id),
      Boolean(row.is_location_verified),
    ])
  );

  return rows.map((row) => ({
    regionId: Number(row.region_id),
    locationId: Number(row.location_id),
    venueName: String(row.venue_name ?? "").trim() || "Unnamed venue",
    address: row.address ?? null,
    neighborhood: row.neighborhood ?? null,
    rawOverall: Number(row.raw_overall),
    distinctReviewers: Number(row.distinct_reviewers),
    latestReviewAt: String(row.latest_review_at),
    refreshedAt: String(row.refreshed_at),
    regulars: regulars.get(String(row.location_id)) ?? [],
    isGoldenGlass: true,
    is_location_verified:
      verifiedByLocation.get(String(row.location_id)) ?? false,
  }));
}
