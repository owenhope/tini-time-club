import type { GoldenGlassInspectionRow } from "@/lib/placeTypes";

export interface GoldenGlassInspectionRpcRow {
  region_id: number | string;
  location_id: number | string;
  calculated_rank: number | string;
  raw_overall: number | string;
  adjusted_score: number | string;
  distinct_reviewers: number | string;
  [key: string]: unknown;
}

export const normalizeGoldenGlassInspectionRows = (
  rows: GoldenGlassInspectionRpcRow[]
): GoldenGlassInspectionRow[] =>
  rows.map((row) => ({
    ...row,
    region_id: Number(row.region_id),
    location_id: Number(row.location_id),
    calculated_rank: Number(row.calculated_rank),
    raw_overall: Number(row.raw_overall),
    adjusted_score: Number(row.adjusted_score),
    distinct_reviewers: Number(row.distinct_reviewers),
  })) as GoldenGlassInspectionRow[];
