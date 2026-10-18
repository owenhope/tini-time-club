import { supabase } from "@/utils/supabase";
import { getMyPassport } from "@/services/passportService";
import { reportError } from "@/utils/log";

export interface FavoritePlace {
  location_id: number;
  location_name: string;
  location_address: string | null;
  is_golden_glass: boolean;
  is_location_verified: boolean;
  saved_at: string;
}
export type FavoritesCursor = { savedAt: string; locationId: number };
const locationKey = (id: string | number) => {
  if (!/^[1-9]\d*$/.test(String(id)))
    throw new Error("Location is unavailable.");
  return String(id);
};

export async function getLocationFavorite(
  id: string | number
): Promise<boolean> {
  const { data, error } = await supabase.rpc("get_location_favorite", {
    p_location_id: locationKey(id),
  });
  if (error) throw error;
  if (typeof data !== "boolean")
    throw new Error("Favorite status is unavailable.");
  return data;
}

export async function setLocationFavorite(
  id: string | number,
  saved: boolean
): Promise<boolean> {
  const { data, error } = await supabase.rpc("set_location_favorite", {
    p_location_id: locationKey(id),
    p_saved: saved,
  });
  if (error) throw error;
  if (typeof data !== "boolean")
    throw new Error("Favorite status is unavailable.");
  // The write awards stamps atomically. Refresh shared points without treating
  // a follow-up read failure as a failed save.
  if (data)
    await getMyPassport().catch((cause) =>
      reportError("Unable to refresh Passport after saving a favorite:", cause)
    );
  return data;
}

export async function getProfileFavorites(
  profileId: string,
  cursor?: FavoritesCursor | null
) {
  const { data, error } = await supabase.rpc("get_profile_favorites", {
    p_profile_id: profileId,
    p_before_time: cursor?.savedAt ?? null,
    p_before_id: cursor?.locationId ?? null,
  });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("Favorites are unavailable.");
  const decoded: FavoritePlace[] = data.map((row) => {
    if (
      !row ||
      !Number.isSafeInteger(row.location_id) ||
      row.location_id <= 0 ||
      typeof row.location_name !== "string" ||
      typeof row.saved_at !== "string" ||
      !Number.isFinite(Date.parse(row.saved_at))
    ) {
      throw new Error("Favorites are unavailable.");
    }
    return {
      location_id: row.location_id,
      location_name: row.location_name,
      location_address:
        typeof row.location_address === "string" ? row.location_address : null,
      is_golden_glass: row.is_golden_glass === true,
      is_location_verified: row.is_location_verified === true,
      saved_at: row.saved_at,
    };
  });
  const items = decoded.slice(0, 30);
  const last = items.at(-1);
  return {
    items,
    cursor:
      decoded.length > 30 && last
        ? { savedAt: last.saved_at, locationId: last.location_id }
        : null,
  };
}
