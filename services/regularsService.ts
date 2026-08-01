import { supabase } from "@/utils/supabase";
import { reportError } from "@/utils/log";

export interface Regular {
  location_id: number;
  rank: number;
  profile_id: string;
  username: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  /** Global active review count used for the member rank. */
  profile_review_count?: number;
  /** Active reviews at this location, used for regular placement. */
  review_count: number;
}

export interface ProfileRegularPlace {
  location_id: number;
  location_name: string;
  location_address?: string | null;
  rank: number;
  review_count: number;
}

// Regulars change only when reviews land, but the places map asks for them
// on every pan. A short per-location cache absorbs that chatter; callers
// that need post-write freshness (the celebration check) pass maxAgeMs: 0.
const REGULARS_CACHE_TTL_MS = 2 * 60 * 1000;
const regularsCache = new Map<string, { at: number; regulars: Regular[] }>();

export async function getRegularsByLocation(
  locationIds: (number | string)[],
  { maxAgeMs = REGULARS_CACHE_TTL_MS }: { maxAgeMs?: number } = {}
): Promise<Map<string, Regular[]>> {
  const ids = [...new Set(locationIds.map(Number).filter(Number.isFinite))];
  if (ids.length === 0) return new Map();

  const now = Date.now();
  const grouped = new Map<string, Regular[]>();
  const missing: number[] = [];
  for (const id of ids) {
    const cached = regularsCache.get(String(id));
    if (cached && now - cached.at < maxAgeMs) {
      grouped.set(String(id), cached.regulars);
    } else {
      missing.push(id);
    }
  }
  if (missing.length === 0) return grouped;

  const { data, error } = await supabase.rpc("get_regulars_for_locations", {
    p_location_ids: missing,
    p_limit: 3,
  });

  if (error) {
    reportError("Error fetching regulars:", error);
    return grouped;
  }

  const fetched = new Map<string, Regular[]>();
  for (const regular of (data ?? []) as Regular[]) {
    const key = String(regular.location_id);
    fetched.set(key, [...(fetched.get(key) ?? []), regular]);
  }
  // Cache misses too: most locations have no regulars, and an uncached
  // empty result would defeat the cache exactly where the map is densest.
  for (const id of missing) {
    const regulars = fetched.get(String(id)) ?? [];
    regularsCache.set(String(id), { at: now, regulars });
    if (regulars.length > 0) grouped.set(String(id), regulars);
  }
  return grouped;
}

export async function getProfileRegularPlaces(
  profileId: string
): Promise<ProfileRegularPlace[]> {
  const { data, error } = await supabase.rpc("get_profile_regular_places", {
    p_profile_id: profileId,
  });

  if (error) throw error;
  return (data ?? []) as ProfileRegularPlace[];
}
