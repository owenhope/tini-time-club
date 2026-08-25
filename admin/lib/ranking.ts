/**
 * Admin's adapter to the shared rank model. Keeping this import in one place
 * prevents admin components from copying thresholds and tier colors.
 */
export {
  RANK_TIERS,
  getRankProgress,
  getRankTier,
  type RankProgress,
  type RankTier,
} from "../../utils/ranking";

import { RANK_TIERS, getRankTier } from "../../utils/ranking";

export const tierFor = (reviewCount: number | null | undefined) =>
  getRankTier(reviewCount) ?? RANK_TIERS[0];
