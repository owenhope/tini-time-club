import { supabase } from "@/utils/supabase";
import { getRankTier, type RankTier } from "@/utils/ranking";
import { getRegularsByLocation } from "@/services/regularsService";
import { warn } from "@/utils/log";

/**
 * Post-review achievement detection. Everything here is best-effort: a
 * failed check must never block or fail the review submission, so errors
 * degrade to "no celebration".
 */

export type Achievement =
  | { kind: "rank"; tier: RankTier }
  | { kind: "regular"; locationId: number; locationName: string };

/**
 * Whether a profile currently holds a Regular spot at a location. Always
 * bypasses the regulars cache: the before/after pair around a review insert
 * must observe the actual transition, not a cached snapshot.
 */
export const isRegularAt = async (
  locationId: number | string | null | undefined,
  profileId: string
): Promise<boolean> => {
  if (locationId == null) return false;
  try {
    const grouped = await getRegularsByLocation([locationId], { maxAgeMs: 0 });
    const regulars = grouped.get(String(Number(locationId))) ?? [];
    return regulars.some((regular) => regular.profile_id === profileId);
  } catch (error) {
    warn("Regular check failed:", error);
    return false;
  }
};

export interface RankCheck {
  /** Fresh trigger-maintained review count, or null if the read failed. */
  newCount: number | null;
  /** The tier just entered, or null if this review didn't cross a floor. */
  rankUp: RankTier | null;
}

/**
 * Detect a tier crossing right after a review insert. Reads the fresh
 * trigger-maintained count so it's exact even if the local profile is stale.
 */
export const checkRankUp = async (profileId: string): Promise<RankCheck> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("review_count")
      .eq("id", profileId)
      .single();
    if (error || data?.review_count == null) {
      return { newCount: null, rankUp: null };
    }

    const newCount = data.review_count;
    const before = getRankTier(newCount - 1);
    const after = getRankTier(newCount);
    return {
      newCount,
      rankUp: after && after.key !== before?.key ? after : null,
    };
  } catch (error) {
    warn("Rank check failed:", error);
    return { newCount: null, rankUp: null };
  }
};
