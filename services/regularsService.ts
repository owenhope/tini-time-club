import { supabase } from "@/utils/supabase";

export interface Regular {
  location_id: number;
  rank: number;
  profile_id: string;
  username: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  review_count: number;
}

export interface ProfileRegularPlace {
  location_id: number;
  location_name: string;
  location_address?: string | null;
  rank: number;
  review_count: number;
}

export async function getRegularsByLocation(
  locationIds: (number | string)[]
): Promise<Map<string, Regular[]>> {
  const ids = [...new Set(locationIds.map(Number).filter(Number.isFinite))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_regulars_for_locations", {
    p_location_ids: ids,
    p_limit: 3,
  });

  if (error) {
    console.error("Error fetching regulars:", error);
    return new Map();
  }

  const grouped = new Map<string, Regular[]>();
  for (const regular of (data ?? []) as Regular[]) {
    const key = String(regular.location_id);
    grouped.set(key, [...(grouped.get(key) ?? []), regular]);
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
