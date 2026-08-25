import { RANK_TIERS } from "./ranking";

export interface TierDistributionRow {
  tier: string;
  color: string;
  count: number;
  /** Review count that earns the tier. */
  min: number;
  /** Last review count still inside the tier; null at the top. */
  max: number | null;
  /** The tier above, and the review count that reaches it. */
  next: { tier: string; min: number } | null;
}

export const buildTierDistribution = (
  profiles: { review_count: number | null }[]
): TierDistributionRow[] =>
  RANK_TIERS.map((tier, index) => {
    const next = RANK_TIERS[index + 1];
    return {
      tier: tier.name,
      color: tier.color,
      count: profiles.filter(
        (profile) =>
          (profile.review_count ?? 0) >= tier.min &&
          (!next || (profile.review_count ?? 0) < next.min)
      ).length,
      min: tier.min,
      max: next ? next.min - 1 : null,
      next: next ? { tier: next.name, min: next.min } : null,
    };
  });
