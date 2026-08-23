import type { LocationRating, Profile } from "@/types/types";
import { supabase } from "@/utils/supabase";

export type DiscoveryCursor = Record<string, string | number>;

export interface DiscoveryPage<T> {
  items: T[];
  nextCursor: DiscoveryCursor | null;
  hasMore: boolean;
}

export interface DiscoveredProfile extends Profile {
  follower_count: number;
  review_count: number;
}

export interface DiscoveredLocation extends LocationRating {
  regulars: unknown[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const decodeCursor = (value: unknown): DiscoveryCursor | null => {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string | number] =>
      typeof entry[1] === "string" || typeof entry[1] === "number"
  );
  return entries.length ? Object.fromEntries(entries) : null;
};

const decodePage = <T>(value: unknown): DiscoveryPage<T> => {
  if (!isRecord(value)) throw new Error("Discovery returned an invalid page.");
  return {
    items: (Array.isArray(value.items) ? value.items : []) as T[],
    nextCursor: decodeCursor(value.nextCursor),
    hasMore: value.hasMore === true,
  };
};

export async function getDiscoverProfilesPage({
  query,
  cursor = null,
  limit = 25,
}: {
  query?: string;
  cursor?: DiscoveryCursor | null;
  limit?: number;
} = {}): Promise<DiscoveryPage<DiscoveredProfile>> {
  const { data, error } = await supabase.rpc("get_discover_profiles_page_v1", {
    p_cursor: cursor,
    p_limit: limit,
    p_search: query?.trim() || null,
  });
  if (error) throw error;
  return decodePage<DiscoveredProfile>(data);
}

export async function getDiscoverLocationsPage({
  query,
  cursor = null,
  limit = 25,
  nearby,
}: {
  query?: string;
  cursor?: DiscoveryCursor | null;
  limit?: number;
  nearby?: { latitude: number; longitude: number; radiusKm: number } | null;
} = {}): Promise<DiscoveryPage<DiscoveredLocation>> {
  const { data, error } = await supabase.rpc("get_discover_locations_page_v1", {
    p_cursor: cursor,
    p_latitude: nearby?.latitude ?? null,
    p_limit: limit,
    p_longitude: nearby?.longitude ?? null,
    p_query: query?.trim() || null,
    p_radius_km: nearby?.radiusKm ?? null,
  });
  if (error) throw error;
  return decodePage<DiscoveredLocation>(data);
}
