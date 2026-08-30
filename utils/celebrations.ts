import { supabase } from "@/utils/supabase";
import type { RankTier } from "@/utils/ranking";
import { warn } from "@/utils/log";

/**
 * Post-review achievement detection. Everything here is best-effort: a
 * failed check must never block or fail the review submission, so errors
 * degrade to "no celebration".
 */

export type Achievement =
  | { kind: "rank"; tier: RankTier }
  | { kind: "regular"; locationId: number; locationName: string };

interface AchievementTransition {
  rankUp: RankTier | null;
  wasRegular: boolean | null;
  isRegular: boolean;
  locationId: number | null;
  locationName: string | null;
}

/** Convert the fresh post-write checks into the moments shown to the member. */
export const collectAchievements = ({
  rankUp,
  wasRegular,
  isRegular,
  locationId,
  locationName,
}: AchievementTransition): Achievement[] => {
  const achievements: Achievement[] = [];

  if (rankUp) achievements.push({ kind: "rank", tier: rankUp });
  if (wasRegular === false && isRegular && locationId != null) {
    achievements.push({
      kind: "regular",
      locationId,
      locationName: locationName?.trim() || "this location",
    });
  }

  return achievements;
};

const achievementKey = (achievement: Achievement) =>
  achievement.kind === "rank"
    ? achievement.tier.key
    : `regular:${achievement.locationId}`;

export const logCelebrationEvent = async (
  achievement: Achievement,
  channel: "modal" | "sheet",
  outcome: "shown" | "shared" | "dismissed"
) => {
  try {
    const { error } = await supabase.rpc("log_celebration_event", {
      p_kind: achievement.kind,
      p_achievement_key: achievementKey(achievement),
      p_channel: channel,
      p_outcome: outcome,
      p_location_id:
        achievement.kind === "regular" ? achievement.locationId : null,
    });
    if (error) warn("Celebration analytics failed:", error);
  } catch (error) {
    warn("Celebration analytics failed:", error);
  }
};
